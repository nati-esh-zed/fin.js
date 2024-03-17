

const Fin = function(rootElement) {
	'use strict'
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
	Fin.ATTRIB_TOKEN = Fin.FIN_ATTRIB_PREFIX+'';
	Fin.CAPTURED_ATTRIB_TOKEN = Fin.FIN_ATTRIB_PREFIX+':';
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
		'use strict'
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
		'use strict'
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
		const evaluateInContextImpl = function(__functionCode__, __varParamsValueCode__, __withVars__) {
			'use strict'
			let __result__ = undefined;
			const __completeCode__ = '__result__='+__functionCode__+__varParamsValueCode__;
			eval(__completeCode__);
			return __result__;
		};
		const evaluateInContext = function(__code__, __withVars__, __isExpression__) {
			'use strict'
			const varNames = __withVars__ ? Object.keys(__withVars__) : undefined;
			if(!(varNames && varNames.length > 0) && __isExpression__) {
				const __expressionCode__ = '('+__code__+')';
				const __result__ = evaluateInContextImpl.call(context, __expressionCode__, '', __withVars__);
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
					'}).bind(context)';
				const __result__ = evaluateInContextImpl.call(context, __functionCode__, varParamsValueCode, __withVars__);
				return __result__;
			}
		};
		this.prepareForUpdate = function() {
			this.output.replaceChildren();
		};
		this.validName = function(name) {
			'use strict'
			return !name 
				? undefined
				: name.replaceAll(/\-+([a-z])/g, function(match, letter) { return letter.toUpperCase(); });
		};
		this.setVar = function(varName, value) {
			'use strict'
			varName = context.validName(varName);
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
		this.getVarQuiet = function(varName) {
			'use strict'
			varName = context.validName(varName);
			// get variable
			const variable = this.variables.has(varName)
					? this.variables.get(varName)
					: this.parent && this.parent.getVarQuiet(varName);
			return variable;
		};
		this.getVarAddRef = function(varName) {
			'use strict'
			return this.getVar(varName, {addReference: true});
		};
		this.getVarNoRef = function(varName) {
			'use strict'
			return this.getVar(varName, {addReference: false});
		};
		this.getVar = function(varName, options) {
			'use strict'
			const addReference = !!options && !!options.addReference;
			const targetNode  = this.activeNode;
			varName = context.validName(varName);
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
		this.hasVar = function(varName) {
			'use strict'
			varName = context.validName(varName);
			return this.variables.has(varName) ||
				(this.parent && this.parent.hasVar(varName));
		};
		this.removeVar = function(varName) {
			'use strict'
			varName = context.validName(varName);
			this.variables.delete(varName);
		};
		this.updateReferences = function(variable) {
			'use strict'
			if(variable) {
				for(let referencingContext of variable.references) {
					const references = referencingContext[1];
					for(let referencingNode of references) {
						fin.update(referencingContext[0], referencingNode);
					}
				}
			}
		};
		this.parseVariableReferences = function(code, addReference, noError) {
			'use strict'
			const updateSet = new Map();
			const output = code.replaceAll(
				Fin.REGEXP.VARIABLES, 
				function(matchVP, token1, token2, opToken, varName) {
					if(token1 || token2)
						return matchVP;
					if(opToken === Fin.VAR_UPDATE_TOKEN) 
						updateSet.set(varName, true);
					const validVarName = context.validName(varName ? varName : varName2);
					const variable = context.getVarQuiet(varName);
					if(!variable) {
						if(opToken === Fin.VAR_UNDEFINED_TOKEN)
							return undefined;
						else {
							const error = '`'+Fin.VAR_PREFIX_TOKEN+(opToken||'')+varName+'` '+varName+' not defined!';
							if (!noError) {
								const codePos = arguments[arguments.length-2];
								const code    = arguments[arguments.length-1];
								const lastNewLineIndex1 = Math.max(0, code.lastIndexOf('\n', codePos));
								const lastNewLineIndex2 = Math.max(0, code.lastIndexOf('\n', lastNewLineIndex1-1));
								const lastNewLineIndex3 = Math.max(0, code.lastIndexOf('\n', lastNewLineIndex2-1));
								const lastNewLineIndex = lastNewLineIndex3;
								const nextLineIndex = Math.max(code.length, code.indexOf('\n', codePos));
								const codePiece = code.substring(lastNewLineIndex, lastNewLineIndex1+1)+
									'>'+
									code.substring(lastNewLineIndex1+1, nextLineIndex);
								console.error({
									error: error,
									context: context,
									where: codePiece
								});
							}
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
							const variableCode = 'this.getVarAddRef(\''+validVarName+'\').value';
							return variableCode;
						} else {
							const variableCode = 'this.getVarNoRef(\''+validVarName+'\').value';
							return variableCode;
						}
					}
				}
			);
			return [output, updateSet];
		};
		this.extractVarInfo = function(inputText) {
			'use strict'
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
		this.processText = function(inputText, withVars) {
			'use strict'
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
							result = evaluateInContext(intermediateText, withVars, 
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
		this.processValue = function(inputText, withVars) {
			'use strict'
			let result = undefined;
			if(inputText.indexOf('{'+Fin.CODE_BLOCK_COMMENT_TOKEN) === 0)
				return result;
			const isCodeBlock = inputText.charAt(0) === '{' 
				&& inputText.charAt(inputText.length-1) === '}';
			if(isCodeBlock) {
				const isIntermediate = inputText.indexOf('{'+Fin.CODE_BLOCK_INTERMEDIATE_TOKEN) === 0;
				const isReturningBlock = inputText.indexOf('{'+Fin.CODE_BLOCK_RETURNING_TOKEN) === 0;
				const startBlockIndex = isReturningBlock || isIntermediate ? 2 : 1;
				const endBlockIndex = 
							 inputText.lastIndexOf(Fin.CODE_BLOCK_RETURNING_TOKEN+'}') === inputText.length-2
						|| inputText.lastIndexOf(Fin.CODE_BLOCK_INTERMEDIATE_TOKEN+'}') === inputText.length-2
					? inputText.length-2 : inputText.length-1;
				const codeBlock = inputText.substring(startBlockIndex, endBlockIndex);
				const [intermediateText_, updateSet] = 
				context.parseVariableReferences(codeBlock, null, isIntermediate);
				const intermediateText = intermediateText_.replaceAll('\\z', '');
				if(isIntermediate) 
					result = intermediateText;
				else
					result = evaluateInContext(intermediateText, withVars, !isReturningBlock);
				// update variable references
				for(let entry of updateSet) {
					const varName  = entry[0];
					const variable = context.getVarQuiet(varName);
					context.updateReferences(variable);
				}
			} else {
				result = context.processText(inputText);
			}
			return result;
		};
		this.update = function(targetNode) {
			'use strict'
			fin.update(context, targetNode);
		};
	};
	const contextMap  = new Map();
	const rootContext = new Context(rootElement, null);
	/* initialize */
	contextMap.set(rootElement, rootContext);
	this.initContext = function(element, parent) {
		'use strict'
		const context = new Context(element, parent);
		contextMap.set(element, context);
		return context;
	};
	this.getOrInitContext = function(element, parent) {
		'use strict'
		return (contextMap && contextMap.get(element))
			|| fin.initContext(element, parent);
	};
	this.getContext = function(selectorOrElement) {
		'use strict'
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
	this.update = function(context, targetNode) {
		'use strict'
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
			} else if(attribute.name.indexOf(Fin.CAPTURED_ATTRIB_TOKEN) === 0) {
				const attributeName  = attribute.name.substring(Fin.CAPTURED_ATTRIB_TOKEN.length);
				const varName = attribute.value === '' 
					? attributeName
					: context.processText(attribute.value).trim();
					context.setVar(varName, function(attributeValue) { 
						'use strict'
						const ctx = context;
						if(!!attributeValue || attributeValue === '') {
							ctx.output.setAttribute(attributeName, attributeValue);
							ctx.output[attributeName] = attributeValue;
						} else if(arguments.length >= 2 && !attributeValue) {
							if(ctx.output.attributes.hasOwnProperty(attributeName)) 
								ctx.output.attributes.removeNamedItem(attributeName);
							if(ctx.output[attributeName] !== undefined)
								delete ctx.output[attributeName];
						} else {
							const attrib = ctx.output.attributes.getNamedItem(attributeName);
							return attrib && attrib.value; 
						}
					});
				processed = true;
			} else if(attribute.name.indexOf(Fin.ATTRIB_TOKEN) === 0) {
				const attributeName  = attribute.name.substring(Fin.ATTRIB_TOKEN.length);
				const attributeValue = context.processValue(attribute.value);
				if(!!attributeValue || attributeValue === '') {
					if(attributeName === 'style' &&
						typeof attributeValue === 'object') {
						for(let entry of Object.entries(attributeValue)) {
							if(entry[1])
								context.output.style[entry[0]] = entry[1];
						}
					} else {
						const outputAttribute = document.createAttribute(attributeName);
						outputAttribute.value = attributeValue;
						context.output.attributes.setNamedItem(outputAttribute);
					}
				} else {
					if(context.output.attributes.hasOwnProperty(attributeName))
						context.output.attributes.removeNamedItem(attributeName);
					if(context.output[attributeName] !== undefined)
						delete context.output[attributeName];
				}
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
				const nodeContext = fin.getOrInitContext(node, context);
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
	this.updateRoot = function(targetNode) {
		'use strict'
		return fin.update(rootContext, targetNode);
	};
	const jsonToString = function(json, doNotQuoteKeys, indent, tab, newLine) {
		'use strict'
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
	Fin.Variable = Variable;
	Fin.Context  = Context;
};

