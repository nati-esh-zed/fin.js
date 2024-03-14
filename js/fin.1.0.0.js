
/**
 * fin.js v1.0.0
 * 
 * @author Natnael Eshetu
 * @license MIT License copyright (c) 2024
 * @summary final js library for fine execution of javascript code 
 *          inside HTML attributes and bodies without the script tag.
 *
 * SETUP:
 * 
 * - first include script in head.
 * ```
 *      <script src="js/fin.1.0.0.js"></script>
 * ```
 * - then create a root element in body.
 * ```
 *      <body>
 *          <div id="root">
 *          </div>
 *      </body>
 * ```
 * - finally initialize and update the root element.
 * ```
 *      <script>
 *          const [root, rootContext] = fin.update(document.getElementById('root'));
 *      </script>
 * ```
 * 
 * SYNTAX:
 * 
 *   CODE BLOCKS:
 * 
 *   - {...}
 *   - {...$var-name...} 
 *   - {...$varName...} 
 *   - {\{...\}} 
 * 
 *   ATTRIBUTES:
 * 
 *     fin-let-async-<var-name>="[string]"|"{...}"
 *        processes the code block and asynchronously sets the variable <var-name> with the value of the output.
 *      initially the value will be undefined.
 *     fin-let-<var-name>="[string]"|"{...}"
 *        processes the code block and sets the variable <var-name> with the value of the output.
 *     fin-on<event>="{...}"
 *        processes the code block when the event is triggered.
 *        A `local` object variable is provided with the event property set. 
 *     fin-html-async="{...}"
 *        processes the code block and asynchronously sets the innerHTML with the value of the output.
 *        initially the innerHTML will be the given innerHTML.
 *     fin-html="{...}"
 *        processes the code block and sets the innerHTML with the value of the output.
 *     fin-if="{...}"
 *        processes the code block and sets the innerHTML with the given innerHTML if the output 
 *        evaluates to a truthy value, or else sets the innerHTML to empty string.
 *     fin-for="{...; ...; ...}"
 *        processes the iteration code block along with the innerHTML. 
 *     fin-escape="{...}"|fin-escape
 *        processes the code block as a condition and skips processing of fin code in the innerHTML.
 *     fin-escape-html="{...}"|fin-escape-html
 *        processes the code block as a condition and converts the innerHTML to text content.
 *     fin-set-if-<attribute>="{...}" 
 *        processes the code block and sets the attribute <attribute> with the value of the output.
 *     fin-<attribute>="{...}" 
 *        processes the code block as a conditional expression and sets the attribute <attribute> to '' 
 *        if the condition evaluates to a truthy value.
 * 
 * NOTES:
 * 
 * - When fin.update is called a new context and a clone element is created for each element in the target
 *   if a context has not been created for that element. Each attribute is processed and
 *   the ones prefixed fin- will be processed and removed from the original element. i.e. it will only remain
 *   in the clone element. After processing the attributes the body is processed.
 * - fin.update returns the root element and its context in an array;
 * - variable identifier characters include [a-zA-Z0-9_-] and cannot begin with a digit.
 *   And variable identifiers including -[a-zA-Z] will be converted to uppercase without the dash.
 *   like `an-apple` -> `anApple` and `-an-apple` -> `AnApple`
 * 
 * CLASSES
 * 
 *  Fin
 *  fin.Variable
 *  fin.Context
 *  fin.JsonObject
 * 
 * VARIABLES AND FUNCTIONS
 * 
 *  Fin scope:
 *    variables:
 *      fin
 *      contexts
 *      zeroWidthWhiteSpace
 *    functions:
 *      [this] update
 *      getContext
 *      jsonToString
 *      jsonArray
 *      JsonObject
 *      jsonify
 *      fetchText
 *      fetchJson
 *      delay
 *      sleep
 * 
 *  Fin.Context scope:
 *    variables:
 *      context
 *      element
 *      clone
 *      parentContext
 *      variables
 *      referenceList
 *    functions:
 *      varName
 *      setVar
 *      setNew
 *      setOrNew
 *      set
 *      setVarAsync
 *      setNewAsync
 *      setOrNewAsync
 *      setAsync
 *      get
 *      has
 *      updateReferencingElements
 *      removeElement
 *      addElement
 *      evaluateInContext
 *      parseVariables
 *      processCodeBlocks
 * 
 * EXAMPLE:
 *  <head> 
 *      <script src="js/fin.1.0.0.js"></script>
 *  </head>
 *  <body> 
 *      <main id="root"
 *          fin-let-name="Adam"
 *          fin-let-message="{'Hello '+$name}"
 *          fin-class="{'border p-2'}"
 *          >
 *          <button 
 *              fin-let-count="{0}" 
 *              fin-onclick="{this.set('count', $count+1)}"
 *              ><p>count: {$count}</p></button>
 *          <p>{$message}</p>
 *          <p>{$message += '!'}</p>
 *          <p>{$message}</p>
 *          <p>{this.set('message', ':: '+$message)}</p>
 *          <p>{$message}</p>
 *          <p>{console.log($message); fin.zeroWidthWhiteSpace}</p>
 *      </main>
 *      <script>
 *          const [root, rootContext] = fin.update(document.getElementById('root'));
 *      </script>
 *  </body>
 *
 */

const Fin = function() {
    const fin = this;
    const Variable = function(name, value) {
        this.name = name;
        this.value = value;
        this.referenceList = new Map();
        this.toString = function() {
            return '{ '+
                'name: "'+this.name+'", '+
                'value: '+(typeof this.value === 'string'
                    ? '"'+this.value+'"'
                    : this.value)+
                ' }';
        };
    };
    this.Variable = Variable;
    const Context = function(element, parentContext) {
        const context = this;
        this.element = element;
        this.parentContext = parentContext;
        this.variables = new Map();
        this.referenceList = new Map();
        // clone elements
        this.clone = element.cloneNode();
        this.clone.innerHTML = element.innerHTML;
        this.varName = function(name) {
            return name.replaceAll(/\-+([a-zA-Z])/g, 
                function(match, letter) { return letter.toUpperCase(); }
            );
        };
        // set Variable object
        this.setVar = function(variable, doNotUpdateReferences) {
            context.variables.set(variable.name, variable);
            if(!doNotUpdateReferences)
                context.updateReferencingElements(variable.name);
            return variable;
        };
        // set new variable
        this.setNew = function(name, value) {
            const variable = new Variable(name, value);
            context.variables.set(name, variable);
            return variable;
        };
        // set existing or new variable
        this.setOrNew = function(name, value, doNotUpdateReferences) {
            if(context.variables.has(name)) {
                const variable = context.variables.get(name);
                variable.value = value;
                if(!doNotUpdateReferences)
                    context.updateReferencingElements(name);
                return variable;
            } else {
                const variable = new Variable(name, value);
                context.variables.set(name, variable);
                return variable;
            }
        };
        // set variable only if declared
        this.set = function(name, value, doNotUpdateReferences) {
            name = context.varName(name);
            console.assert(context.has(name), 
                'variable \''+name+'\' must be declared before setting!',
                context);
            if(!context.has(name))
                return undefined;
            const variable = context.get(name);
            variable.value = value;
            if(!doNotUpdateReferences)
                context.updateReferencingElements(name);
            return variable;
        };
        // set Variable object from value promise
        this.setVarAsync = async function(variable, initValue, doNotUpdateReferences) {
            variable.value = initValue;
            variable.value = await variable.value;
            context.setVar(variable, doNotUpdateReferences);
        }
        // set new variable from promise
        this.setNewAsync = async function(name, promise, initValue) {
            const variable = context.setNew(name, initValue);
            variable.value = await promise;
            context.setVar(variable);
        }
        // set existing or new variable from promise
        this.setOrNewAsync = async function(name, promise, initValue, doNotUpdateReferences) {
            const variable = context.setOrNew(name, initValue, doNotUpdateReferences);
            variable.value = await promise;
            context.setVar(variable);
        }
        // set variable from promise
        this.setAsync = async function(name, promise, initValue, doNotUpdateReferences) {
            const variable = context.set(name, initValue, doNotUpdateReferences);
            variable.value = await promise;
            context.setVar(variable, doNotUpdateReferences);
        };
        // get variable
        this.get = function(name, element, updateAttributes) {
            name = context.varName(name);
            const variable = (context.variables.has(name) && context.variables.get(name))
                || (context.parentContext && context.parentContext.get(name));
            if(element) {
                variable.referenceList.set(element, updateAttributes == true);
                context.referenceList.set(variable, false);
            }
            return variable;
        };
        // has variable
        this.has = function(name) {
            name = context.varName(name);
            return context.variables.has(name) 
                || (context.parentContext && context.parentContext.has(name));
        };
        this.updateReferencingElements = function(name) {
            name = context.varName(name);
            const variable = (context.variables.has(name) && context.variables.get(name))
                || (context.parentContext && context.parentContext.get(name));
            if(variable && variable.referenceList.size > 0) {
                for(let updateTarget of variable.referenceList) {
                    const target = updateTarget[0];
                    const reprocessAttributes = updateTarget[1];
                    fin.update(target, reprocessAttributes);
                }
            }
        };
        // safely remove elements with their clone and variable references
        this.removeElement = function(element) {
            if(element instanceof HTMLElement) {
                const elementContext = fin.contexts.get(element);
                if(elementContext) {
                    if(elementContext.referenceList) {
                        for(let reference of elementContext.referenceList) {
                            const variable = reference[0];
                            variable.referenceList.delete(element);
                        }
                    }
                    elementContext.clone.remove();
                    fin.contexts.delete(elementContext);
                }
                element.remove();
            }
        };
        // safely add element
        // <element> = HTMLElement or HTMLFragment
        // [options] = { 
        //      method: default('append') ['append' | 'replaceChild' | 'replaceChildren'],
        //      child: HTMLElement for method 'replaceCHild'
        // }
        this.addElement = function(element, toParent, options) {
            console.assert(element !== toParent, 
                '<element> and <toParent> cannot be the same',
                element, toParent);
            console.assert(element !== undefined && (element instanceof HTMLElement || element instanceof DocumentFragment), 
                '<element> must be instance of HTMLElement or DocumentFragment',
                element);
            console.assert(toParent !== undefined && (toParent instanceof HTMLElement), 
                '<toParent> must be instance of HTMLElement',
                toParent);
            console.assert(options === undefined || options instanceof Object,
                '[options] should be undefined or instance of Object',
                options);
            const parentContext  = fin.contexts.get(toParent);
            console.assert(parentContext !== undefined && parentContext instanceof Context, 
                '<toParent> does not have a valid context');
            if(element === toParent 
                || !(element !== undefined && (element instanceof HTMLElement || element instanceof DocumentFragment))
                || !(toParent !== undefined && (toParent instanceof HTMLElement))
                || !(options === undefined || options instanceof Object)
                || !(parentContext !== undefined && parentContext instanceof Context))
                return;
            options = options === undefined ? {} : options;
            const method = options === undefined || options.method === undefined 
                ? 'append' : options.method;
            console.assert(method === 'append' || method === 'appendChild' || method === 'appendChildren',
                '[options.method] must be either of [\'append\', \'appendChild\', \'appendChildren\']');
            if(!(method === 'append' || method === 'appendChild' || method === 'appendChildren'))
                return;
            if(method === 'replaceChild') {
                console.assert(options.child !== undefined && options.child instanceof HTMLElement,
                    '[options.child] must be instance of HTMLElement for method \'replaceChild\'');
                if(!(options.child !== undefined && options.child instanceof HTMLElement))
                    return;
            }
            if(element instanceof HTMLElement) {
                if(method === 'append') {
                    toParent.appendChild(element);
                } else if(method === 'replaceChild') {
                    const child = options.child;
                    const childContext = fin.contexts.get(child);
                    childContext.parentContext = undefined;
                    toParent.replaceChild(element, child);
                } else if(method === 'replaceChildren') {
                    for(let child of toParent.children) {
                        const childContext = fin.contexts.get(child);
                        childContext.parentContext = undefined;
                    }
                    toParent.replaceChildren(element);
                }
                fin.update(element, true, parentContext);
            } else if(element instanceof DocumentFragment) {
                const children = [];
                for(let childElement of element.children) {
                    children.push(childElement);
                }
                if(method === 'append') {
                    for(let childElement of children) {
                        toParent.appendChild(childElement);
                        fin.update(childElement, true, parentContext);
                    }
                } else if(method === 'replaceChild') {
                    const child = options.child;
                    const childContext = fin.contexts.get(child);
                    childContext.parentContext = undefined;
                    toParent.replaceChild(element, child);
                    for(let childElement of children) {
                        fin.update(childElement, true, parentContext);
                    }
                } else if(method === 'replaceChildren') {
                    for(let child of toParent.children) {
                        const childContext = fin.contexts.get(child);
                        childContext.parentContext = undefined;
                    }
                    toParent.replaceChildren(element);
                    for(let childElement of children) {
                        fin.update(childElement, true, parentContext);
                    }
                }
            }
        };
        this.evaluateInContext = function(__fin_code__, element, local) {
            'use strict';
            local = local === undefined ? {} : local;
            local.element = element;
            return eval(__fin_code__);
        };
        this.parseVariables = function(input, options) {
            'use strict';
            const evaluate = options && options.evaluate;
            const updateAttributes = options && options.updateAttributes;
            const updateSet = new Map();
            // replace variables with getter code
            let code = input.replaceAll(
                /(?:(')(?:\\'|.)*?'|(")(?:\\"|.)*?"|([\$\#])(\?)?((?:[a-zA-Z_\-][\w_\-]*)?[\w_*])((?:\.[\w_\-]+|\[.*?\])*))/gs, 
                function(matchVP, token1, token2, type, returnUndefinedIfNotDefined, varName, varAccess) {
                    if(token1 || token2)
                        return matchVP;
                    if(type === '#') 
                        updateSet.set(varName, true);
                    // turn `-my-var` to `MyVar` in var name
                    varName = context.varName(varName);
                    if(context.has(varName)) {
                        let varValueCode;
                        const bUpdateAttributes = !updateAttributes ? false : true;
                        varValueCode = 'context.get(\''+varName+'\','+(type === '$' && 'element')+','+bUpdateAttributes+').value'+varAccess;
                        return varValueCode;
                    } else if(returnUndefinedIfNotDefined) {
                        return undefined;
                    } else {
                        const error = '"{ERROR@{'+matchVP+'}:`'+varName+'` is not defined}"';
                        console.error(error, context.clone, context.element);
                        return error;
                    }
                }
            );
            if(evaluate) {
                try {
                    const output = context.evaluateInContext(code, element);
                    return [output, updateSet];
                } catch(error) {
                    evalVarValueOutput = '{ERROR@{'+input+'}:'+error+'}';
                }
                return [undefined, updateSet];
            }
            return [code, updateSet];
        };
        this.processCodeBlocks = function(input, element, options, local) {
            'use strict';
            const wholeBlock = options && options.wholeBlock;
            const updateAttributes = options && options.updateAttributes;
            // replace code blocks with evaluated output
            const output  = input.replaceAll(wholeBlock 
                    ? /(?:(')(?:\\'|.)*?'|(")(?:\\"|.)*?"|((?:\\?[\\\*])?\{)((?:(?:\\[}{])*?|.*?)*)\})/gs 
                    : /(?:(')(?:\\'|.)*?'|(")(?:\\"|.)*?"|((?:\\?[\\\*])?\{)((?:(?:\\[}{])*?|.*?)*?)\})/gs, 
                function(match, token1, token2, token3, code) {
                    if(token1 || token2)
                        return match.replaceAll(/\\([}{])/gm, '$1');
                    else if(token3 === '\\{') // escape
                        return match.substring(1).replaceAll(/\\([}{])/gm, '$1');
                    else if(token3 === '*{') // comment
                        return '';
                    else if(token3) {
                        code = code.replaceAll(/\\([}{])/gm, '$1');
                        // replace variables with values
                        const [varParsedCode, updateList] = context.parseVariables(code, {
                            evaluate: false,
                            updateAttributes: updateAttributes
                        });
                        let evalCodeBlockOutput;
                        try {
                            evalCodeBlockOutput = context.evaluateInContext(varParsedCode, element, local);
                            // update variable references
                            for(let entry of updateList) {
                                const varName = entry[0];
                                context.updateReferencingElements(varName);
                            }
                        } catch(error) {
                            evalCodeBlockOutput = '{ERROR@{'+code+'}:'+error+'}';
                        }
                        return typeof evalCodeBlockOutput === 'string' ? evalCodeBlockOutput : evalCodeBlockOutput;
                    }
                    return undefined;
                }
            );
            return output;
        }
    };
    this.Context = Context;
    this.contexts = new Map();
    const zeroWidthWhiteSpace = "\u200B";
    this.zeroWidthWhiteSpace = zeroWidthWhiteSpace;
    this.update = function(element, reprocessAttributes, parentContext, local_) {
        console.assert(element !== undefined && element instanceof HTMLElement, 
            '<element> must be instance of HTMLElement',
            element);
        if(!(element !== undefined && element instanceof HTMLElement)) 
            return [element, undefined];
        parentContext = parentContext === undefined ? fin.contexts.get(element.parentElement) : parentContext;
        // check if context was previously created
        const initialized = fin.contexts.has(element);
        if(!fin.contexts.has(element))  {
            // create a new Context and add it to contexts map
            fin.contexts.set(element, new Context(element, parentContext));
        }
        local_ = local_ === undefined ? {} : local_;
        const context    = fin.contexts.get(element);
        const clone      = context.clone;
        let   escapeHtml = !!context.escapeHtml;
        let   escapeFin  = false;
        if(!initialized || reprocessAttributes) {
            const finPrefix = 'fin-';
            const finLetToken = 'let-';
            const finLetAsyncToken = 'let-async-';
            const finOnToken = 'on';
            const finHtmlAsyncToken = 'html-async';
            const finHtmlToken = 'html';
            const finIfToken = 'if';
            const finForToken = 'for';
            const finEscapeToken = 'escape';
            const finEscapeHtmlToken = 'escape-html';
            const finSetIfToken = 'set-if-';
            // update attributes
            for(let attribute of clone.attributes) {
                if(!escapeFin && attribute.name.indexOf(finPrefix) === 0) {
                    const finCommand = attribute.name.substring(finPrefix.length);
                    // fin-let-async-<var-name>
                    if(finCommand.indexOf(finLetAsyncToken) === 0) {
                        const finLetAsyncVarNameRaw = finCommand.substring(finLetAsyncToken.length);
                        // turn `-my-var` to `MyVar` in var name
                        finLetAsyncVarName = context.varName(finLetAsyncVarNameRaw);
                        if(finLetAsyncVarName.length > 0 && finLetAsyncVarName.search(/^[a-zA-Z_\-][\w_\-]*$/gm) === 0) {
                            if(!context.letAsyncWaiting) {
                                context.letAsyncWaiting = true;
                                const variable = context.setOrNew(finLetAsyncVarName, undefined);
                                const varValueStr = attribute.value.charAt(0) === '{' 
                                    ? attribute.value.substring(1, attribute.value.length-1)
                                    : '"'+attribute.value+'"';
                                (async function() {
                                    try {
                                        const local   = { ...local_, promise: undefined };
                                        const varCode = '{ local.promise = '+varValueStr+'}';
                                        context.processCodeBlocks(varCode, element, 
                                            { wholeBlock: true, updateAttributes: true }, 
                                            local);
                                        variable.value = await local.promise;
                                        context.setVar(variable);
                                    } catch(error) {
                                        console.error('Error when setting variable: '+attribute.name+'='+attribute.value+'\n', 
                                        error, clone);
                                    }
                                    context.letAsyncWaiting = false;
                                })();
                            } else {
                                console.warn('context.letAsyncWaiting ', context.letAsyncWaiting);
                            }
                        } else {
                            console.error('Error invalid variable identifier: '+finLetAsyncVarName, 
                                clone);
                        }
                    } 
                    // fin-let-<var-name>
                    else if(finCommand.indexOf(finLetToken) === 0) {
                        const finLetVarNameRaw = finCommand.substring(finLetToken.length);
                        // turn `-my-var` to `MyVar` in var name
                        finLetVarName = context.varName(finLetVarNameRaw);
                        if(finLetVarName.length > 0 && finLetVarName.search(/^[a-zA-Z_\-][\w_\-]*$/gm) === 0) {
                            const varValueStr = attribute.value.charAt(0) === '{' 
                                ? attribute.value.substring(1, attribute.value.length-1)
                                : '"'+attribute.value+'"';
                            try {
                                const local   = { ...local_, value: undefined };
                                const varCode = '{ local.value = '+varValueStr+'}';
                                context.processCodeBlocks(varCode, element, 
                                    { wholeBlock: true, updateAttributes: true }, 
                                    local);
                                context.setOrNew(finLetVarName, local.value, true);
                            } catch(error) {
                                console.error('Error when setting variable: '+attribute.name+'='+attribute.value+'\n', error, clone);
                            }
                        } else {
                            console.error('Error invalid variable identifier: '+finLetVarName, clone);
                        }
                    } 
                    // fin-on<event>
                    else if(finCommand.indexOf(finOnToken) === 0) {
                        if(!initialized) {
                            if(!context.onEventHandling) {
                                context.onEventHandling = true;
                                const finEventName = finCommand.substring(finOnToken.length);
                                const eventHandler = function(event) {
                                    'use strict';
                                    const eventCode = attribute.value.trim();
                                    const local = { ...local_, event: event };
                                    context.processCodeBlocks(eventCode, element, 
                                        { wholeBlock: true, updateAttributes: false },
                                        local);
                                };
                                element.addEventListener(finEventName, eventHandler);
                                context.onEventHandling = false;
                            } else  {
                                console.warn('context.onEventHandling ', context.onEventHandling);
                            }
                        }
                    } 
                    // fin-html-async
                    else if(finCommand === finHtmlAsyncToken) {
                        if(!context.htmlProcessing) {
                            context.htmlProcessing = true;
                            if(!context.htmlAsyncProcessing) {
                                context.htmlAsyncProcessing = true;
                                if(!initialized)
                                    context.savedInnerHTML = element.innerHTML;
                                for(let child of element.children) {
                                    if(child)
                                        context.removeElement(child);
                                }
                                clone.innerHTML   = context.savedInnerHTML;
                                element.innerHTML = context.savedInnerHTML;
                                (async function() {
                                    const htmlCode = '{ local.promise = '+attribute.value.trim().substring(1,attribute.value.length-1)+'}';
                                    const local   = { ...local_, promise: undefined };
                                    context.processCodeBlocks(htmlCode, element, 
                                        { wholeBlock: false, updateAttributes: true },
                                        local); 
                                    const response    = await local.promise;
                                    clone.innerHTML   = response;
                                    element.innerHTML = response;
                                    fin.update(element, false, context.parentContext, local_);
                                    context.htmlAsyncProcessing = false;
                                })();
                            } else  {
                                console.warn('context.htmlAsyncProcessing ', context.htmlAsyncProcessing);
                            }
                            context.htmlProcessing = false;
                        } else  {
                            console.warn('context.htmlProcessing ', context.htmlProcessing);
                        }
                    } 
                    // fin-html
                    else if(finCommand === finHtmlToken) {
                        if(!context.htmlProcessing) {
                            context.htmlProcessing = true;
                            if(!initialized)
                                context.savedInnerHTML = element.innerHTML;
                            for(let child of element.children) {
                                if(child)
                                    context.removeElement(child);
                            }
                            const htmlCode = attribute.value.trim();
                            const output = context.processCodeBlocks(htmlCode, element, 
                                { wholeBlock: false, updateAttributes: true },
                                local_);
                            if(!output || (htmlCode.charAt(0) == '{' && 
                                htmlCode.charAt(htmlCode.length-1) == '}' &&
                                output.trim() === 'undefined')) {
                                clone.innerHTML   = context.savedInnerHTML;
                                element.innerHTML = context.savedInnerHTML;
                            } else {
                                clone.innerHTML   = output;
                                element.innerHTML = output;
                            }
                            context.htmlProcessing = false;
                        } else  {
                            console.warn('context.htmlProcessing ', context.htmlProcessing);
                        }
                    } 
                    // fin-if
                    else if(finCommand === finIfToken) {
                        if(!context.htmlProcessing) {
                            context.htmlProcessing = true;
                            // escapeHtml = true;
                            const conditionCode = '{ local.condition = '+attribute.value.substring(1,attribute.value.length-1)+'}';
                            const local   = { ...local_, condition: undefined };
                            context.processCodeBlocks(conditionCode, element, 
                                { wholeBlock: true, updateAttributes: true },
                                local); 
                            const condition = !!local.condition;
                            if(condition) {
                                element.innerHTML = clone.innerHTML;
                                fin.update(element, false, context.parentContext, local_);
                            } else {
                                element.innerHTML = '';
                                escapeHtml = true;
                            }
                            context.htmlProcessing = false;
                        } else  {
                            console.warn('context.htmlProcessing ', context.htmlProcessing);
                        }
                    } 
                    // fin-for
                    else if(finCommand === finForToken) {
                        if(!context.htmlProcessing) {
                            context.htmlProcessing = true;
                            escapeHtml = true;
                            if(!initialized)
                                context.savedInnerHTML = element.innerHTML;
                            for(let child of element.children) {
                                if(child)
                                    context.removeElement(child);
                            }
                            const local = {
                                ...local_, 
                                __parent_clone__: clone,
                                __parent__: element,
                                __parentContext__: context,
                                __savedHTML__: context.savedInnerHTML
                            }; 
                            const forDeclarations = attribute.value.substring(1,attribute.value.length-1);
                            const match_of_in     = forDeclarations.matchAll(/let?\s+((?:\w+\s*(?:,\s*)?)+|\[(?:\w+\s*(?:,\s*)?)+\]|\{(?:\w+\s*(?:,\s*)?)+\})\s+(of|in)\s+(.*)/gm).next().value;
                            const match_regular   = forDeclarations.matchAll(/(.*;.*;.*)/gm).next().value;
                            let local_declarations = '';
                            let varNames = [];
                            if(match_of_in) {
                                const match_vars = match_of_in[1].matchAll(/((?:\w+\s*(?:,\s*)?)+)|\[((?:\w+\s*(?:,\s*)?)+)\]|\{((?:\w+\s*(?:,\s*)?)+)\}/gm).next().value;
                                if(match_vars[1])
                                    varNames = match_vars[1].split(', ');
                                else if(match_vars[2])
                                    varNames = match_vars[2].split(', ');
                                else if(match_vars[3])
                                    varNames = match_vars[3].split(', ');
                            } else if(match_regular) {
                                const match_vars = match_regular[1].matchAll(/(?:let\s+)?((?:(?:\w+\s=.*?\s*(?:,\s*)?)+)*);.*;.*/gm).next().value;
                                if(match_vars[1]) {
                                    varNames = match_vars[1].split(', ').map(function(varName) {
                                        return varName.match(/(\w+)/gm)[0];
                                    }); 
                                }
                            } else {
                                error = 'ERROR@{for('+forDeclarations+')...}: bad for loop declaration block';
                                console.error(error, context.element);
                            }
                            for(let varName of varNames)
                                local_declarations += 'local.'+varName+' = '+varName+'; '; 
                            const forLoopCode = '{ for('+forDeclarations+') { '+
                            local_declarations+
                            'const __tagDefined__ = local.tag !== undefined; '+
                            'const element = document.createElement(__tagDefined__ ? local.tag : \'div\'); '+
                            'element.innerHTML = local.__savedHTML__; '+
                            'const children = []; '+
                            'if(!__tagDefined__) { '+
                            '    for(let child of element.childNodes) { '+
                            '        children.push(child); '+
                            '    } '+
                            '} else { '+
                            '    children.push(element); '+
                            '} '+
                            'for(let child of children) { '+
                            '    if(child.nodeName === \'#text\') { '+
                            '        const childClone = document.createTextNode(child.innerHTML); '+
                            '        const content = child.textContent; '+
                            '        const output  = context.processCodeBlocks(content, local.__parent__, { '+
                            '                wholeBlock: false, '+
                            '                reprocessAttributes: false '+
                            '            }, '+
                            '            local '+
                            '        ); '+
                            '        child.textContent = output; '+
                            '        local.__parent__.appendChild(child); '+
                            '        local.__parent_clone__.appendChild(childClone); '+
                            '    } else { '+
                            '        const childClone = child.cloneNode(); '+
                            '        childClone.innerHTML = child.innerHTML; '+
                            '        fin.update(child, true, local.__parentContext__, local); '+
                            '        local.__parent__.appendChild(child); '+
                            '        local.__parent_clone__.appendChild(childClone); '+
                            '     } '+
                            '} '+
                            '} }';
                            element.replaceChildren();
                            clone.replaceChildren();
                            context.processCodeBlocks(forLoopCode, element, 
                                { wholeBlock: true, updateAttributes: true },
                                local); 
                            context.htmlProcessing = false;
                        } else  {
                            console.warn('context.htmlProcessing ', context.htmlProcessing);
                        }
                    } 
                    // fin-escape
                    else if(finCommand === finEscapeToken) {
                        let condition = true;
                        if(attribute.value !== '') {
                            const conditionCode = '{ local.condition = '+attribute.value.substring(1,attribute.value.length-1)+'}';
                            const local   = { ...local_, condition: undefined };
                            context.processCodeBlocks(conditionCode, element, 
                                { wholeBlock: true, updateAttributes: true },
                                local); 
                            condition = !!local.condition;
                        }
                        escapeFin = condition;
                        element.innerHTML = clone.innerHTML;
                    } 
                    // fin-escape-html
                    else if(finCommand === finEscapeHtmlToken) {
                        let condition = true;
                        if(attribute.value !== '') {
                            const conditionCode = '{ local.condition = '+attribute.value.substring(1,attribute.value.length-1)+'}';
                            const local   = { ...local_, condition: undefined };
                            context.processCodeBlocks(conditionCode, element, 
                                { wholeBlock: true, updateAttributes: true },
                                local); 
                            condition = !!local.condition;
                        }
                        if(condition && !context.htmlProcessing) {
                            context.htmlProcessing = true;
                            escapeHtml = true;
                            context.escapeHtml = true;
                            const input  = element.innerHTML;
                            // format html attributes
                            const output = input
                            .replaceAll(/\n?(\s*)(<\w+)\s+((?:(['"])(?:\\\4|.)*?\4|.)*?)\s*(\/?>)/gs, 
                                function(_m_, indent, start, attributes, stringToken4, end) {
                                    const match = attributes.match(/\s*([\w\-_]+(?:\=(?:(['"])\{(?:\\\2|.)*?\}\2|(['"])(?:\\\3|.)*?\3|\S+)|\b))/gs);
                                        attributes = attributes.replaceAll(/\s*([\w\-_]+(?:=(?:(['"])\{(?:\\\2|.)*?\}\2|(['"])(?:\\\3|.)*?\3|\S+)|\b))/gs, 
                                            function(_m1_, attribute) {
                                                if(attribute.indexOf('=""') !== -1)
                                                    attribute = attribute.substring(0, attribute.length-3);
                                                if(match.length > 1)
                                                    return '\n'+indent+'  '+attribute;
                                                else
                                                    return ' '+attribute;
                                            }
                                        );
                                    return '\n'+indent+start+attributes+
                                        indent+(match.length > 1 ? '\n  ' : '')+end;
                                }
                            );
                            element.textContent = output;
                            context.htmlProcessing = false;
                        }
                    } 
                    // fin-set-if-<attribute>
                    else if(finCommand.indexOf(finSetIfToken) === 0) {
                        if(!context.setIfAttributeProcessing) {
                            context.setIfAttributeProcessing = true;
                            const attributeName = finCommand.substring(finSetIfToken.length);
                            const conditionCode = '{ local.condition = '+attribute.value.substring(1,attribute.value.length-1)+'}';
                            const local   = { ...local_, condition: undefined };
                            context.processCodeBlocks(conditionCode, element, 
                                { wholeBlock: true, updateAttributes: true },
                                local); 
                            const condition = !!local.condition;
                            if(condition) {
                                element.setAttribute(attributeName, '');
                            }
                            context.setIfAttributeProcessing = false;
                        } else  {
                            console.warn('context.setIfAttributeProcessing ', context.setIfAttributeProcessing);
                        }
                    } 
                    // fin-<attribute>
                    else if(finCommand.length > 0) {
                        const attributeName = finCommand;
                        if(!context.attributeProcessing)
                            context.attributeProcessing = new Set();
                        if(!(context.attributeProcessing.has(attributeName))) 
                        {
                            context.attributeProcessing.add(attributeName);
                            const output = context.processCodeBlocks(attribute.value, element, 
                                { wholeBlock: true, updateAttributes: true },
                                local_);
                            element.setAttribute(attributeName, output);
                            context.attributeProcessing.delete(attributeName);
                        } else  {
                            console.warn('context.attributeProcessing ', context.attributeProcessing.get(attributeName));
                        }
                    } 
                    // fin-
                    else {
                        console.error('Error invalid attribute: ', attribute, clone);
                    }
                    if(!initialized)
                        element.removeAttribute(attribute.name);
                }
            }
        }
        // update child nodes
        if(!(escapeHtml || escapeFin) && !context.htmlProcessing) {
            context.htmlProcessing = true;
            let childIndex = 0;
            let childrenToBeRemoved = [];
            for(let child of clone.childNodes) {
                const mainChild = element.childNodes[childIndex++];
                if(child.nodeName === '#text') {
                    const content = child.textContent;
                    const output  = context.processCodeBlocks(content, element, {
                            wholeBlock: false,
                            reprocessAttributes: false
                        },
                        local_
                    );
                    if(mainChild instanceof Node)
                        mainChild.textContent = output;
                } else if(child instanceof HTMLElement 
                    && mainChild instanceof HTMLElement) {
                    fin.update(mainChild, reprocessAttributes, context, local_);
                } else {
                    childrenToBeRemoved.push(child);
                }
            }
            // remove childrenToBeRemoved
            for(let child of childrenToBeRemoved) {
                clone.removeChild(child);
            }
            context.htmlProcessing = false;
        }
        return [element, context];
    };
    const getContext = function(element) {
        return fin.contexts.get(element);
    };
    this.getContext = getContext;
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
    this.jsonToString = jsonToString;
    const jsonArray = function(array) {
        const jsonArray_ = [];
        for(let entry of array) {
            if(entry === undefined || entry === null)
                jsonArray_.push(null);
            else if(typeof entry === 'string')
                jsonArray_.push(entry);
            else if(typeof entry === 'number')
                jsonArray_.push(entry);
            else if(typeof entry === 'boolean')
                jsonArray_.push(entry);
            else if(entry instanceof Array)
                jsonArray_.push(jsonArray(entry));
            else if(entry instanceof Object)
                jsonArray_.push(new JsonObject(entry));
            else
                jsonArray_.push(entry);
        }
        return jsonArray_;
    };
    this.jsonArray = jsonArray;
    const JsonObject = function(object) {
        for(let entry of Object.entries(object)) {
            if(entry[1] === undefined || entry[1] === null)
                this[entry[0]] = null;
            else if(typeof entry[1] === 'string')
                this[entry[0]] = entry[1];
            else if(typeof entry[1] === 'number')
                this[entry[0]] = entry[1];
            else if(typeof entry[1] === 'boolean')
                this[entry[0]] = entry[1];
            else if(entry[1] instanceof Array)
                this[entry[0]] = jsonArray(entry[1]);
            else if(entry[1] instanceof Object)
                this[entry[0]] = new JsonObject(entry[1]);
            else
                this[entry[0]] = entry[1];
        }
        return this;
    };
    JsonObject.prototype.toString = function() {
        return jsonToString(this);
    };
    this.JsonObject = JsonObject;
    const jsonObject = function(object) {
        return new JsonObject(object);
    };
    this.jsonObject = jsonObject;
    const jsonify = function(object) {
        if(object instanceof Array)
            return jsonArray(object);
        return new JsonObject(object);
    };
    this.jsonify = jsonify;
    const fetchText = function(url, ms) {
        if(ms === undefined)
            return new Promise(function(resolve) {
                resolve(fetch(url)
                    .then(function(resp) {
                        return resp.text()
                    })
                );
            });
        else
            return new Promise(function(resolve) {
                setTimeout(function () {
                    resolve(fetch(url)
                        .then(function(resp) {
                            return resp.text()
                        })
                    );
                }, ms);
            });
    };
    this.fetchText = fetchText;
    const fetchJson = function(url, ms) {
        if(ms === undefined)
            return new Promise(function(resolve) {
                resolve(fetch(url)
                    .then(function(resp) {
                        return resp.json() 
                    })
                    .then(function(jsonObject) {
                        return jsonify(jsonObject);
                    })
                );
            });
        else
            return new Promise(function(resolve) {
                setTimeout(function () {
                    resolve(fetch(url)
                        .then(function(resp) {
                            return resp.json() 
                        })
                        .then(function(jsonObject) {
                            return jsonify(jsonObject);
                        })
                    );
                }, ms);
            });
    };
    this.fetchJson = fetchJson;
    const delay = function(ms, then) {
        return new Promise(function(resolve) {
            setTimeout(function() {
                resolve(then());
            }, ms);
        });
    };
    this.delay = delay;
    const sleep = function(ms) {
        return new Promise(function(resolve) {
            setTimeout(resolve, ms);
        });
    };
    this.sleep = sleep;
};

const fin = new Fin();
