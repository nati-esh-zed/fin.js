

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
	Fin.VAR_PREFIX_TOKEN              = '$';
	Fin.CODE_BLOCK_ESCAPE_TOKEN       = '@';
	Fin.CODE_BLOCK_RETURNING_TOKEN    = '#';
	Fin.CODE_BLOCK_COMMENT_TOKEN      = '*';
	Fin.CODE_BLOCK_INTERMEDIATE_TOKEN = '%';
	Fin.VAR_UNDEFINED_TOKEN           = '?';
	Fin.VAR_UPDATE_TOKEN              = ':';
	Fin.REGEXP = {
		BLOCK: /\{([#\@\*\%]?)((?:\\#[}{]|.)*?)\1\}/gs,
		VARIABLES: /(?:(')(?:\\'|.)*?'|(")(?:\\"|.)*?"|\$([\:\?])?((?:[a-zA-Z_\-][\w_\-]*)?[\w_]))/gs
	};
	Fin.IdTop = 1;
	const Variable = function(name, value) {
		this.name       = name;
		this.value      = value;
		this.references = new Map();
		this.hasReference = function(referencingContext, targetNode) {
			let referencingNodes = this.references.get(referencingContext); 
			if(!referencingNodes)
				return false;
			else if(targetNode)
				return referencingNodes.indexOf(targetNode) !== -1;
			else 
				return true;
		};
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
		context.evaluateInsideImpl = function(__functionCode__, __varParamsValueCode__, __withVars__) {
			let __result__ = undefined;
			const __completeCode__ = '__result__='+__functionCode__+__varParamsValueCode__;
			eval(__completeCode__);
			return __result__;
		};
		context.evaluateInside = function(__code__, __withVars__, __isExpression__) {
			const varNames = __withVars__ ? Object.keys(__withVars__) : undefined;
			if(!(varNames && varNames.length > 0) && __isExpression__) {
				const __expressionCode__ = '('+__code__+')';
				const __result__ = this.evaluateInsideImpl(__expressionCode__, '', __withVars__);
				return __result__;
			} else {
				const varParamsCode      = varNames ? varNames.join(',') : '';
				const varParamsValueCode = '('+(varNames
					? varNames.map(function(varName) {
						return '__withVars__[\''+varName+'\']';
					}).join(',') 
					: ''
				)+')';
				const returnCode = __isExpression__
					? 'return ('
					: '';
				const endParen = __isExpression__ ? ')' : '';
				const __functionCode__ = '(function('+varParamsCode+'){'+ 
					returnCode+__code__+endParen+';'+
					'})';
				const __result__ = this.evaluateInsideImpl(__functionCode__, varParamsValueCode, __withVars__);
				return __result__;
			}
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
		const getVarAddRef = function(varName) {
			return this.getVar(varName, {addReference: true});
		};
		const getVarNoRef = function(varName) {
			return this.getVar(varName, {addReference: false});
		};
		const getVar = function(varName, options) {
			const addReference = !!options && !!options.addReference;
			const targetNode  = context.activeNode;
			varName = validName(varName);
			// get variable
			const variable = this.variables.has(varName)
					? this.variables.get(varName)
					: this.parent && this.parent.getVarQuiet(varName, options);
			// add context and context.activeNode to variable references
			if(variable && targetNode && addReference) {
				const referencingContext = context; 
				let referencingNodes = variable.references.get(referencingContext); 
				if(!referencingNodes) {
					referencingNodes = [];
					variable.references.set(referencingContext, referencingNodes);
				}
				if(referencingNodes.indexOf(targetNode) === -1)
					referencingNodes.push(targetNode);
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
		const parseVariableReferences = function(code, addReference, noError) {
			const updateSet = new Map();
			const output = code.replaceAll(
				Fin.REGEXP.VARIABLES, 
				function(matchVP, token1, token2, opToken, varName) {
					if(token1 || token2)
						return matchVP;
					if(opToken === Fin.VAR_UPDATE_TOKEN) 
						updateSet.set(varName, true);
					validVarName = validName(varName ? varName : varName2);
					const variable = context.getVarQuiet(varName);
					if(!variable) {
						if(opToken === Fin.VAR_UNDEFINED_TOKEN)
							return undefined;
						else if (!noError) {
							const codePos = arguments[arguments.length-2];
							const code    = arguments[arguments.length-1];
							const lastNewLineIndex1 = Math.max(0, code.lastIndexOf('\n', codePos));
							const lastNewLineIndex2 = Math.max(0, code.lastIndexOf('\n', lastNewLineIndex1-1));
							const lastNewLineIndex3 = Math.max(0, code.lastIndexOf('\n', lastNewLineIndex2-1));
							const lastNewLineIndex = lastNewLineIndex3;
							const nextLineIndex = Math.max(code.length, code.indexOf('\n', codePos));
							const error = '`'+Fin.VAR_PREFIX_TOKEN+(opToken||'')+varName+'` '+varName+' not defined!';
							console.error({
								error: error,
								context: context,
							});
							const codePiece = code.substring(lastNewLineIndex, lastNewLineIndex1+1)+
								'>'+
								code.substring(lastNewLineIndex1+1, nextLineIndex);
							console.warn(codePiece);
							return '"{! '+error+' !}"';
						}
					} else {
						addReference = !!addReference;
						if(opToken && opToken === Fin.VAR_UPDATE_TOKEN)
							addReference = false;
						else if(!context.initialized)
							addReference = true;
						else if(variable)
							addReference = !variable.hasReference(context, context.activeNode);
						if(addReference) {
							const variableCode = 'context.getVarAddRef(\''+validVarName+'\').value';
							return variableCode;
						} else {
							const variableCode = 'context.getVarNoRef(\''+validVarName+'\').value';
							return variableCode;
						}
					}
				}
			);
			return [output, updateSet];
		};
		const extractVarInfo = function(inputText) {
			const varMap = new Map();
			inputText.replaceAll(Fin.REGEXP.BLOCK, 
				function(_m_, blockTypeToken, codeBlock) {
					codeBlock.replaceAll(Fin.REGEXP.VARIABLES, 
						function(matchVP, token1, token2, opToken, varName) {
							const referenceCount = varMap.has(varName) 
								? varMap.get(varName)+1 : 1;
							varMap.set(varName, {
								referenceCount: referenceCount,
								opToken: opToken
							});
							return undefined;
						}
					);
					return undefined;
				}
			);
			return varMap;
		};
		const processText = function(inputText, withVars) {
			const outputText = inputText.replaceAll(Fin.REGEXP.BLOCK, 
				function(_m_, blockTypeToken, codeBlock) {
					if(blockTypeToken === Fin.CODE_BLOCK_COMMENT_TOKEN) {
						return '';
					} else if(blockTypeToken === Fin.CODE_BLOCK_ESCAPE_TOKEN) {
						return '{'+codeBlock+'}';
					} else {
						const isIntermediate = blockTypeToken === Fin.CODE_BLOCK_INTERMEDIATE_TOKEN;
						const [intermediateText_, updateSet] 
							= context.parseVariableReferences(codeBlock, null, isIntermediate);
						const intermediateText = intermediateText_.replaceAll('\\z', '');
						let result = undefined;
						if(isIntermediate)
							result = '{'+intermediateText+'}';
						else
							result = context.evaluateInside(intermediateText, withVars, 
								blockTypeToken !== Fin.CODE_BLOCK_RETURNING_TOKEN);
						// update variable references
						for(let entry of updateSet) {
							const varName  = entry[0];
							const variable = context.getVarQuiet(varName);
							context.updateReferences(variable);
						}
						return result;
					}
				}
			);
			return outputText;
		};
		const processValue = function(inputText, withVars) {
			inputText = inputText.trim();
			let result = undefined;
			if(inputText.indexOf('{'+Fin.CODE_BLOCK_COMMENT_TOKEN) === 0)
				return result;
			const hashedBlockIndex = 
					   inputText.indexOf('{'+Fin.CODE_BLOCK_RETURNING_TOKEN) === 0
					|| inputText.indexOf('{'+Fin.CODE_BLOCK_INTERMEDIATE_TOKEN) === 0
				? 0 : -1;
			const hashedBlockLastIndex = 
					   inputText.lastIndexOf(Fin.CODE_BLOCK_RETURNING_TOKEN+'}') === inputText.length-2
					|| inputText.lastIndexOf(Fin.CODE_BLOCK_INTERMEDIATE_TOKEN+'}') === inputText.length-2
				? inputText.length-2 : inputText.length;
			const isIntermediate = inputText.indexOf('{'+Fin.CODE_BLOCK_INTERMEDIATE_TOKEN) === 0;
			const isCodeBlock = inputText.charAt(0) === '{'
				|| hashedBlockIndex === 0;
			if(isCodeBlock) {
				const startIndex = hashedBlockIndex === 0 ? 2 : 1;
				const endIndex   = hashedBlockLastIndex === inputText.length-2 
					? inputText.length-2 : inputText.length-1;
				const codeBlock = inputText.substring(startIndex, endIndex);
				const [intermediateText_, updateSet] = 
					context.parseVariableReferences(codeBlock, null, isIntermediate);
				const intermediateText = intermediateText_.replaceAll('\\z', '');
				if(isIntermediate) 
					result = intermediateText;
				else
					result = context.evaluateInside(intermediateText, withVars, hashedBlockIndex !== 0);
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
		this.getVarAddRef     = getVarAddRef;
		this.getVarNoRef      = getVarNoRef;
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
			let processed = false;
			context.activeAttribute = attribute;
			if(attribute.name.indexOf(Fin.LET_TOKEN) === 0) {
				const varName  = attribute.name.substring(Fin.LET_TOKEN.length);
				const varValue = context.processValue(attribute.value);
				context.setVar(varName, varValue);
				processed = true;
			} else if(attribute.name.indexOf(Fin.ON_TOKEN) === 0) {
				const eventName = attribute.name.substring(Fin.ON_TOKEN.length);
				const eventCodeBlock = attribute.value;
				let eventHandler = function(event) { 
					const result = context.processValue(eventCodeBlock, {event: event}); 
					return result;
				};
				context.output.addEventListener(eventName, eventHandler);
				processed = true;
			}
			context.activeAttribute = undefined;
			return processed;
		};
		const processNode = function(node) {
			let processed = false;
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
						processed = true;
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
				processed = true;
			} else if(node.nodeType === Fin.NODE_TYPE_ATTRIBUTE) {
				processed = processAttribute(node);
			}
			context.activeNode = undefined;
			return processed;
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

