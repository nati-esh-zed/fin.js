

const Fin = function(rootElement) {
	if(!(rootElement instanceof HTMLElement))
		throw new Error('rootElement must be instance of HTMLElement');
	const fin = this;
	Fin.NODE_TYPE_ELEMENT   = 1;
	Fin.NODE_TYPE_ATTRIBUTE = 2;
	Fin.NODE_TYPE_TEXT      = 3;
	Fin.NODE_TYPE_COMMENT   = 8;
	Fin.FIN_ATTRIB_PREFIX   = '$';
	Fin.FIN_ID_PREFIX       = 'fin';
	Fin.FIN_ID_TOKEN = Fin.FIN_ATTRIB_PREFIX+'id';
	Fin.LET_TOKEN    = Fin.FIN_ATTRIB_PREFIX+'let-';
	Fin.ON_TOKEN     = Fin.FIN_ATTRIB_PREFIX+'on';
	Fin.REGEXP = {
		BLOCK: /([^\\]|^)\{(?:(?:(.+)\()((?:\\[}{]|.)*?)(?:\)\2)|((?:\\[}{]|.)*?))\}/gs,
		VARIABLES: /(?:(')(?:\\'|.)*?'|(")(?:\\"|.)*?"|([\$\#])(\?)?((?:[a-zA-Z_\-][\w_\-]*)?[\w_]))/g
	};
	Fin.IdTop = 1;
	const Variable = function(name, value) {
		this.name       = name;
		this.value      = value;
		this.references = new Map();
		this.toString   = function() {
			return '{ '+
				'name: "'+this.name+'", '+
				'value: '+(typeof this.value === 'string'
					? '"'+this.value+'"'
					: this.value)+
				' }';
		};
	};
	const Context = function(element, parent) {
		const context = this;
		const ctx     = context;
		this.fin            = fin;
		this.id             = Fin.FIN_ID_PREFIX+(Fin.IdTop++);
		this.element        = element;
		this.input          = element;
		this.output         = element.cloneNode();
		this.input.context  = context;
		this.output.context = context;
		this.input.ctx      = context;
		this.output.ctx     = context;
		this.parent         = parent;
		this.variables      = new Map();
		this.nodes          = new Map();
		this.activeNode     = undefined;
		this.input[Fin.FIN_ID_TOKEN]  = this.id;
		this.output[Fin.FIN_ID_TOKEN] = this.id;
		this.input.setAttribute('fid', this.id);
		this.output.setAttribute('fid', this.id);
		context.input.evaluateInside = function(__code__, __withVars__) {
			const varDeclareCode = __withVars__ 
				? Object.keys(__withVars__).map(function(varName) {
					return 'let '+varName+'=__withVars__[\''+varName+'\'];';
				}).join('') 
				: ''
			;
			let __result__ = undefined;
			const __completeCode__ = varDeclareCode+ 
				'__result__='+__code__+';';
			eval(__completeCode__);
			return __result__;
		};
		context.evaluateInsideElement = function(code, withVars) {
			return context.input.evaluateInside(code, withVars);
		};
		const prepareForUpdate = function() {
			this.output.replaceChildren();
		};
		const validName = function(name) {
			return !name 
				? undefined
				: name.replaceAll(/\-+([a-z])/g, function(match, letter) { return letter.toUpperCase(); });
		};
		const setVar = function(varName, value) {
			varName = validName(varName);
			let variable = this.getVarQuiet(varName);
			if(!variable) {
				variable = new Variable(varName, value);
				this.variables.set(varName, variable);
			} else {
				variable.value = value;
				this.updateReferences(variable);
			}
			return variable;
		};
		const getVarQuiet = function(varName) {
			varName = validName(varName);
			// get variable
			const variable = this.variables.has(varName)
					? this.variables.get(varName)
					: this.parent && this.parent.getVarQuiet(varName);
			return variable;
		};
		const getVar = function(varName, options) {
			const noReference = !!options && !!options.noReference;
			const targetNode  = context.activeNode;
			varName = validName(varName);
			// get variable
			const variable = this.variables.has(varName)
					? this.variables.get(varName)
					: this.parent && this.parent.getVarQuiet(varName, options);
			// add context to references list
			if(variable && targetNode && !noReference) {
				const referencingContext = context; 
				let references = variable.references.get(referencingContext) 
				if(!references) {
					references = [];
					variable.references.set(referencingContext, references);
				}
				if(references.indexOf(targetNode) === -1)
					references.push(targetNode);
			}
			return variable;
		};
		const hasVar = function(varName) {
			varName = validName(varName);
			return this.variables.has(varName) ||
				(this.parent && this.parent.hasVar(varName));
		};
		const removeVar = function(varName) {
			varName = validName(varName);
			this.variables.delete(varName);
		};
		const updateReferences = function(variable) {
			if(variable) {
				for(let referencingContext of variable.references) {
					const references = referencingContext[1];
					for(let referencingNode of references) {
						fin.update(referencingContext[0], referencingNode);
					}
				}
			}
		};
		const parseVariableReferences = function(code) {
			const updateSet = new Map();
			const output = code.replaceAll(
				Fin.REGEXP.VARIABLES, 
				function(matchVP, token1, token2, type, returnUndefinedIfNotDefined, varName) {
					if(token1 || token2)
						return matchVP;
					if(type === '#') 
						updateSet.set(varName, true);
					varName = validName(varName ? varName : varName2);
					const varDefined = context.hasVar(varName);
					if(!varDefined) {
						if(returnUndefinedIfNotDefined)
							return undefined;
						else {
							const codePos = arguments[6];
							const code    = arguments[7];
							const lastNewLineIndex1 = Math.max(0, code.lastIndexOf('\n', codePos));
							const lastNewLineIndex2 = Math.max(0, code.lastIndexOf('\n', lastNewLineIndex1-1));
							const lastNewLineIndex3 = Math.max(0, code.lastIndexOf('\n', lastNewLineIndex2-1));
							const lastNewLineIndex = lastNewLineIndex3;
							const nextLineIndex = Math.max(code.length, code.indexOf('\n', codePos));
							console.warn({
								error: '$'+(varName ? varName : '('+varName2+')')+' not defined!',
								context: context,
							});
							const codePiece = code.substring(lastNewLineIndex, lastNewLineIndex1+1)+
								'>'+
								code.substring(lastNewLineIndex1+1, nextLineIndex);
							console.warn(codePiece);
						}
					}
					const noReference = type === '#';
					let optionsStr = '{noReference: '+noReference+'}';
					return varDefined 
						? '(context.getVar(\''+varName+'\','+
							optionsStr+
							').value)'
						: '\'{$'+varName+' not defined!}\'';
				}
			);
			return [output, updateSet];
		};
		const extractVarInfo = function(inputText) {
			const varNames = new Map();
			inputText.replaceAll(Fin.REGEXP.BLOCK, 
				function(_m_, ch, boundaryToken, codeBlock1, codeBlock2) {
					const codeBlock = codeBlock1 || codeBlock2;
					codeBlock.replaceAll(Fin.REGEXP.VARIABLES, 
						function(matchVP, token1, token2, type, returnUndefinedIfNotDefined, varName) {
							varNames.set(varName, varNames.get(varName) ? varNames.get(varName)+1 : 1);
							return undefined;
						}
					);
					return undefined;
				}
			);
			return varNames;
		};
		const processText = function(inputText, withVars) {
			const outputText = inputText.replaceAll(Fin.REGEXP.BLOCK, 
				function(_m_, ch, boundaryToken, codeBlock1, codeBlock2) {
					const codeBlock = codeBlock1 || codeBlock2;
					const [intermediateText, updateSet] 
						= context.parseVariableReferences(codeBlock);
					let result = undefined;
					result = context.input.evaluateInside(intermediateText, withVars);
					// update variable references
					for(let entry of updateSet) {
						const varName  = entry[0];
						const variable = context.getVarQuiet(varName);
						context.updateReferences(variable);
					}
					return ch+result;
				}
			);
			return outputText;
		};
		const processValue = function(inputText, withVars) {
			const isCodeBlock = inputText.charAt(0) === '{';
			let result = undefined;
			if(isCodeBlock) {
				const codeBlock = inputText.substring(1, inputText.length-1);
				const [intermediateText, updateSet] 
					= context.parseVariableReferences(codeBlock);
				result = context.input.evaluateInside(intermediateText, withVars);
				// update variable references
				for(let entry of updateSet) {
					const varName  = entry[0];
					const variable = context.getVarQuiet(varName);
					context.updateReferences(variable);
				}
			} else {
				result = inputText;
			}
			return result;
		};
		this.update = function(targetNode) {
			fin.update(context, targetNode);
		};
		this.prepareForUpdate = prepareForUpdate;
		this.validName        = validName;
		this.setVar           = setVar;
		this.getVarQuiet      = getVarQuiet;
		this.getVar           = getVar;
		this.hasVar           = hasVar;
		this.removeVar        = removeVar;
		this.updateReferences        = updateReferences;
		this.parseVariableReferences = parseVariableReferences;
		this.extractVarInfo          = extractVarInfo;
		this.processText      = processText;
		this.processValue     = processValue;
	};
	const contextMap  = new Map();
	const rootContext = new Context(rootElement, null);
	/* initialize */
	contextMap.set(rootElement, rootContext);
	const initContext = function(element, parent) {
		const context = new Context(element, parent);
		contextMap.set(element, context);
		return context;
	};
	const getOrInitContext = function(element, parent) {
		return (contextMap && contextMap.get(element))
			|| initContext(element, parent);
	};
	const getContext = function(selectorOrElement) {
		if(typeof selectorOrElement === 'string') {
			const element = rootContext.input.querySelector(selectorOrElement);
			return fin.contextMap.get(element);
		} else if(selectorOrElement instanceof HTMLElement) {
			return fin.contextMap.get(selectorOrElement) ||
					 fin.contextMap.get(rootContext.input.querySelector('['+Fin.FIN_ID_TOKEN+'="'+selectorOrElement.finId+'"]'));
		} else {
			throw ('invalid type for selectorOrElement: '+typeof selectorOrElement);
		}
	};
	const update = function(context, targetNode) {
		if(!context)
			throw new Error('null context');
		if(!(context instanceof Context))
			throw new Error('context must be a valid Fin.Context object');
		const element = context.element;
		const processAttribute = function(attribute) {
			let procecssed = false;
			context.activeAttribute = attribute;
			if(attribute.name.indexOf(Fin.LET_TOKEN) === 0) {
				const varName  = attribute.name.substring(Fin.LET_TOKEN.length);
				const varValue = context.processValue(attribute.value, true);
				context.setVar(varName, varValue);
				procecssed = true;
			} else if(attribute.name.indexOf(Fin.ON_TOKEN) === 0) {
				const eventName = attribute.name.substring(Fin.ON_TOKEN.length);
				const eventCodeBlock = attribute.value;
				let eventHandler;
				eval('eventHandler = function(event) { const __eventCode__ = eventCodeBlock; context.processValue(__eventCode__, {event: event}); }');
				context.output.addEventListener(eventName, eventHandler);
				procecssed = true;
			}
			context.activeAttribute = undefined;
			return procecssed;
		};
		const processNode = function(node) {
			let procecssed = false;
			context.activeNode = node;
			if(node.nodeType === Fin.NODE_TYPE_TEXT) {
				const nodeInfo = context.nodes.get(node);
				if(nodeInfo) {
					const inputText  = node.textContent;
					const outputText = context.processText(inputText);
					const outputNode = nodeInfo.outputNode;
					outputNode.textContent = outputText;
				} else {
					if(node.textContent.trim() !== '') {
						const inputText  = node.textContent;
						const varInfo    = context.extractVarInfo(inputText);
						const outputText = context.processText(inputText);
						const outputNode = document.createTextNode(outputText);
						outputNode.textContent = outputText;
						context.output.appendChild(outputNode);
						const newNodeInfo = { 
							varInfo: varInfo, 
							outputNode: outputNode 
						};
						context.nodes.set(node, newNodeInfo);
						procecssed = true;
					}
				}
			} else if(node.nodeType === Fin.NODE_TYPE_COMMENT) {
				// skip comments
			} else if(node.nodeType === Fin.NODE_TYPE_ELEMENT) {
				// process the children recursively
				const nodeContext = getOrInitContext(node, context);
				const outputNode  = nodeContext.output;
				fin.update(nodeContext);
				context.output.appendChild(outputNode);
				procecssed = true;
			} else if(node.nodeType === Fin.NODE_TYPE_ATTRIBUTE) {
				procecssed = processAttribute(node);
			}
			context.activeNode = undefined;
			return procecssed;
		};
		if(targetNode) {
			if(targetNode !== context.activeNode) {
				processNode(targetNode);
			}
		}
		else if(!context.updating) {
			// process attributes
			context.updating = true;
			if(!context.initialized)
			{
				const attributeRemoveList = [];
				// process attributes
				for(let attribute of element.attributes) {
					context.activeNode = attribute;
					const processed = processAttribute(attribute);
					if(processed)
						attributeRemoveList.push(attribute.name);
					context.activeNode = undefined;
				}
				// remove attributes
				for(let attributeName of attributeRemoveList) {
					context.output.removeAttribute(attributeName);
				}
				// swap rootElement with its front buffer
				if(element === rootElement) {
					element.replaceWith(context.output);
				}
			}
			// process body
			if(!context.processingBody) {
				context.processingBody = true;
				context.prepareForUpdate();
				let index = 0;
				for(let node of context.input.childNodes) {
					const processed = processNode(node);
					if(processed)
						index++;
				}
				context.processingBody = false;
			}
			context.updating = false;
		}
		if(!context.initialized)
			context.initialized = true;
		return context;
	};
	const updateRoot = function(targetNode) {
		return update(rootContext, targetNode);
	};
    const jsonToString = function(json, doNotQuoteKeys, indent, tab, newLine) {
        if(json === undefined)
            return undefined;
        let  jsonStr = 'null';
        if(json) {
            indent  = indent  !== undefined ? indent : '';
            tab     = tab     !== undefined ? tab : "    ";
            newLine = newLine !== undefined ? newLine : "\n";
            const jsonToStringValue = function(value) {
                if(value === undefined || value === null) {
                    return 'null';
                } else if(typeof value === 'boolean' || value instanceof Boolean) {
                    return value ? 'true' : 'false';
                } else if(typeof value === 'number' || value instanceof Number) {
                    return value;
                } else if(value instanceof String) {
                    return '"'+value+'"';
                } else if(value instanceof Array) {
                    return jsonToString(value, doNotQuoteKeys, indent+tab, tab, newLine);
                } else if(value instanceof Object) {
                    return jsonToString(value, doNotQuoteKeys, indent+tab, tab, newLine);
                } else {
                    return '"'+value+'"';
                }
            };
            const newLineJsonValue = function(value) {
                if(value === undefined || value === null) {
                    return false;
                } else if(typeof value === 'boolean' || value instanceof Boolean) {
                    return false;
                } else if(typeof value === 'number' || value instanceof Number) {
                    return false;
                } else if(value instanceof String) {
                    return false;
                } else if(value instanceof Array) {
                    return true;
                } else if(value instanceof Object) {
                    return true;
                } else {
                    return true;
                }
            };
            if(json instanceof Array) {
                jsonStr = '[';
                const entries = json;
                if(entries.length > 0) {
                    const newLineElems = newLineJsonValue(entries[0]);
                    jsonStr += newLineElems ? newLine : '';
                    for(let i = 0; i < entries.length; i++) {
                        const value = entries[i]; 
                        jsonStr += newLineElems ? indent+tab : '';
                        jsonStr += jsonToStringValue(value);
                        jsonStr += i < entries.length-1 ? ', ' : '';
                        jsonStr += newLineElems ? newLine : '';
                    }
                    jsonStr += newLineElems ? indent : '';
                }
                jsonStr += ']';
            } else if(json instanceof Object) {
                jsonStr = '{';
                const entries = Object.entries(json);
                if(entries.length > 0) {
                    jsonStr += newLine;
                    for(let i = 0; i < entries.length; i++) {
                        const entry = entries[i];
                        const key   = entry[0];
                        const value = entry[1];
                        jsonStr += indent+tab;
                        jsonStr += doNotQuoteKeys ? key : '"'+key+'"';
                        jsonStr += ': ';
                        jsonStr += jsonToStringValue(value);
                        jsonStr += i < entries.length-1 ? ', ' : '';
                        jsonStr += newLine;
                    }
                    jsonStr += indent;
                }
                jsonStr += '}';
            } else {
                jsonStr = jsonToStringValue(json);
            }
        }
        return jsonStr;
    };
	this.rootElement = rootElement;
	this.contextMap  = contextMap;
	this.rootContext = rootContext;
	this.update      = update;
	this.updateRoot  = updateRoot;
	this.getContext  = getContext;
	Fin.Variable = Variable;
	Fin.Context  = Context;
};

