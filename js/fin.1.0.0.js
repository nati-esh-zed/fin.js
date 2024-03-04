
/**
 * fin.js v1.0.0
 * 
 * final js library for fine execution of javascript code 
 * inside HTML attributes and bodies without the script tag.
 *
 *  <head> 
 *     <script src="js/fin.1.0.0.js"></script>
 *  </head>
 *  <body> 
*      <main id="main"
*          fin-let-name="Adam"
*          fin-let-message="{'Hello '+$name}"
*          fin-class="{'border p-2'}">
*          <p>{$message+='!'}</p>
*          {console.log($message); ''}
*          <button fin-let-count="{0}" fin-onclick="{$count++; fin.update(local.event.target)}">count: {$count}</button>
*      </main>
*      <script>
*          fin.update(document.getElementById('main'));
*      </script>
*  </body>
 *  </body>
 */

const Fin = function() {
    const fin = this;
    const finPrefix = 'fin-';
    const finLetPrefix = 'let-';
    const finLetAsyncPrefix = 'let-async-';
    const finOnPrefix = 'on';
    const finHtmlPrefix = 'html';
    const Variable = function(name, value) {
        this.name = name;
        this.value = value;
        this.referenceList = new Map();
    };
    const Context = function(element, parentContext) {
        const context = this;
        this.element = element;
        this.parentContext = parentContext;
        this.variables = new Map();
        this.referenceList = new Map();
        this.eventHandlers = new Map();
        // clone elements
        this.clone = element.cloneNode();
        this.clone.innerHTML = element.innerHTML;
        this.varName = function(name) {
            return name.replaceAll(/\-+([a-z])/g, 
                function(match, letter) { return letter.toUpperCase(); }
            );
        };
        // set Variable object
        this.setVar = function(variable) {
            context.variables.set(variable.name, variable);
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
        this.setOrNew = function(name, value) {
            if(context.variables.has(name)) {
                const variable = context.variables.get(name);
                variable.value = value;
                context.updateReferencingElements(name);
                return variable;
            } else {
                const variable = new Variable(name, value);
                context.variables.set(name, variable);
                return variable;
            }
        };
        // set variable
        this.set = function(name, value) {
            name = context.varName(name);
            if(context.has(name)) {
                const variable = context.get(name);
                variable.value = value;
                context.updateReferencingElements(name);
                return variable;
            } else {
                const variable = new Variable(name, value);
                context.variables.set(name, variable);
                context.updateReferencingElements(name);
                return variable;
            }
        };
        // set Variable object from value promise
        this.setVarAsync = async function(variable) {
            variable.value = await variable.value;
            context.setVar(variable);
        }
        // set new variable from promise
        this.setNewAsync = async function(name, promise) {
            const value = await promise;
            context.setNew(name, value);
        }
        // set existing or new variable from promise
        this.setOrNewAsync = async function(name, promise) {
            const value = await promise;
            context.setOrNew(name, value);
        }
        // set variable from promise
        this.setAsync = async function(name, promise) {
            const value = await promise;
            context.set(name, value);
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
                    fin.update(updateTarget[0], updateTarget[1]);
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
            // replace variables with getter code
            const code = input.replaceAll(
                /(?:(')(?:\\'|.)*?'|(")(?:\\"|.)*?"|\$(\?)?([a-zA-Z_\-][\w_\-]*)((?:\.[\w_\-]+|\[.*?\])*))/gs, 
                function(matchVP, token1, token2, returnUndefinedIfNotDefined, varName, varAccess) {
                    if(token1 || token2)
                        return matchVP;
                    // turn `-my-var` to `MyVar` in var name
                    varName = context.varName(varName);
                    if(context.has(varName)) {
                        let varValueCode;
                        try {
                            varValueCode = 'context.get(\''+varName+'\',this.element,'+updateAttributes+').value'+varAccess;
                        } catch(error) {
                            varValueCode = '{ERROR@{'+matchVP+'}:'+error+'}';
                        }
                        return varValueCode;
                    } else if(returnUndefinedIfNotDefined) {
                        return undefined;
                    } else {
                        const error = '"{ERROR@{'+matchVP+'}:`'+varName+'` is not defined}"';
                        return error;
                    }
                }
            );
            if(evaluate) {
                try {
                    const output = context.evaluateInContext(code, element);
                    return output;
                } catch(error) {
                    evalVarValueOutput = '{ERROR@{'+input+'}:'+error+'}';
                }
                return undefined;
            }
            return code;
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
                        const varParsedCode = context.parseVariables(code, {
                            evaluate: false,
                            updateAttributes: updateAttributes
                        });
                        let evalCodeBlockOutput;
                        try {
                            evalCodeBlockOutput = context.evaluateInContext(varParsedCode, element, local);
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
    this.contexts = new Map();
    this.update = async function(element, reprocessAttributes, parentContext) {
        console.assert(element !== undefined && element instanceof HTMLElement, 
            '<element> must be instance of HTMLElement',
            element);
        if(!(element !== undefined && element instanceof HTMLElement)) 
            return;
        parentContext = parentContext === undefined ? fin.contexts.get(element.parentElement) : parentContext;
        // check if context was previously created
        const initialized = fin.contexts.has(element);
        if(!fin.contexts.has(element))  {
            // create a new Context and add it to contexts map
            fin.contexts.set(element, new Context(element, parentContext));
        }
        const context = fin.contexts.get(element);
        const clone   = context.clone;
        if(!initialized || reprocessAttributes) {
            // update attributes
            for(let attribute of clone.attributes) {
                if(attribute.name.indexOf(finPrefix) === 0) {
                    const finCommand = attribute.name.substring(finPrefix.length);
                    // fin-let-async-<var-name>
                    if(finCommand.indexOf(finLetAsyncPrefix) === 0) {
                        const finLetAsyncVarNameRaw = finCommand.substring(finLetAsyncPrefix.length);
                        // turn `-my-var` to `MyVar` in var name
                        finLetAsyncVarName = context.varName(finLetAsyncVarNameRaw);
                        if(finLetAsyncVarName.length > 0 && finLetAsyncVarName.search(/^[a-zA-Z_\-][\w_\-]*$/gm) === 0) {
                            // console.log(existingVariable);
                            if(!context.letAsyncWaiting) {
                                context.letAsyncWaiting = true;
                                const variable = context.setOrNew(finLetAsyncVarName, undefined);
                                (async function() {
                                    try {
                                        const varValueStr = attribute.value.charAt(0) === '{' 
                                            ? attribute.value.substring(1, attribute.value.length-1)
                                            : '"'+attribute.value+'"';
                                        const local   = { promise: undefined };
                                        const varCode = '{ local.promise = '+varValueStr+'}';
                                        context.processCodeBlocks(varCode, element, { wholeBlock: true, updateAttributes: true }, local);
                                        variable.value = await local.promise;
                                        context.setVar(variable);
                                        context.letAsyncWaiting = false;
                                    } catch(error) {
                                        console.error('Error when setting variable: '+attribute.name+'='+varValueCode+'\n', error, clone);
                                    }
                                })();
                            }
                        } else {
                            console.error('Error invalid variable identifier: '+finLetAsyncVarName, clone);
                        }
                    } 
                    // fin-let-<var-name>
                    else if(finCommand.indexOf(finLetPrefix) === 0) {
                        const finLetVarNameRaw = finCommand.substring(finLetPrefix.length);
                        // turn `-my-var` to `MyVar` in var name
                        finLetVarName = context.varName(finLetVarNameRaw);
                        if(finLetVarName.length > 0 && finLetVarName.search(/^[a-zA-Z_\-][\w_\-]*$/gm) === 0) {
                            const varValueStr = attribute.value.charAt(0) === '{' 
                                ? attribute.value.substring(1, attribute.value.length-1)
                                : '"'+attribute.value+'"';
                            try {
                                const local   = { value: undefined };
                                const varCode = '{ local.value = '+varValueStr+'}';
                                context.processCodeBlocks(varCode, element, { wholeBlock: true, updateAttributes: true }, local);
                                context.setOrNew(finLetVarName, local.value);
                            } catch(error) {
                                console.error('Error when setting variable: '+attribute.name+'='+varValueCode+'\n', error, clone);
                            }
                        } else {
                            console.error('Error invalid variable identifier: '+finLetVarName, clone);
                        }
                    } 
                    // fin-on<event>
                    else if(finCommand.indexOf(finOnPrefix) === 0) {
                        const finEventName = finCommand.substring(finOnPrefix.length);
                        const eventHandler = async function(event) { 
                            const eventCode = attribute.value;
                            return context.processCodeBlocks(eventCode, element, 
                                { wholeBlock: true, updateAttributes: false }, 
                                {event: event}); 
                        };
                        element.addEventListener(finEventName, eventHandler);
                        const lastEventHandler = context.eventHandlers.get(finEventName);
                        element.removeEventListener(finEventName, lastEventHandler);
                        context.eventHandlers.set(finEventName, eventHandler);
                    } 
                    // fin-html
                    else if(finCommand === finHtmlPrefix) {
                        finCommand.substring(finHtmlPrefix.length);
                        const htmlCode = attribute.value;
                        let output   = context.processCodeBlocks(htmlCode, element, 
                            { wholeBlock: false, updateAttributes: true }); 
                        output = context.processCodeBlocks(output, element,
                            { wholeBlock: false, updateAttributes: false });
                        element.innerHTML = output;
                    } 
                    // fin-<attribute>
                    else if(finCommand.length > 0) {
                        const output = context.processCodeBlocks(attribute.value, element, 
                            { wholeBlock: true, updateAttributes: true });
                        element.setAttribute(finCommand, output);
                    } 
                    // fin-
                    else {
                        console.error('Error invalid attribute: ', attribute, clone);
                    }
                    element.removeAttribute(attribute.name);
                }
            }
        }
        // update child nodes
        let childIndex = 0;
        for(let child of clone.childNodes) {
            const mainChild = element.childNodes[childIndex++];
            if(child.nodeName === '#text') {
                const content = child.textContent;
                const output  = context.processCodeBlocks(content, element);
                mainChild.textContent = output;
            } else if(child instanceof HTMLElement) {
                fin.update(mainChild, reprocessAttributes, context);
            }
        }
    };
};

const fin = new Fin();
