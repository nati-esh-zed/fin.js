
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
        };
        // set new variable
        this.setNew = function(name, value) {
            const variable = new Variable(name, value);
            context.variables.set(name, variable);
        };
        // set existing or new variable
        this.setOrNew = function(name, value) {
            if(context.variables.has(name)) {
                const variable = context.variables.get(name);
                variable.value = value;
                context.updateReferencingElements(name);
            } else {
                const variable = new Variable(name, value);
                context.variables.set(name, variable);
            }
        };
        // set variable
        this.set = function(name, value) {
            name = context.varName(name);
            if(context.has(name)) {
                const variable = context.get(name);
                variable.value = value;
            } else {
                const variable = new Variable(name, value);
                context.variables.set(name, variable);
            }
            context.updateReferencingElements(name);
        };
        // get variable
        this.get = function(name, element) {
            name = context.varName(name);
            const variable = (context.variables.has(name) && context.variables.get(name))
                || (context.parentContext && context.parentContext.get(name));
            if(element)
                variable.referenceList.set(element, true);
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
                    fin.update(updateTarget[0], false);
                }
            }
        };
        this.runInContext = function(fn) {
            'use strict';
            return fn ? fn() : undefined;
        };
        this.evaluateInContext = function(__fin_code__, element, local) {
            'use strict';
            local = local === undefined ? {} : local;
            local.element = element;
            return eval(__fin_code__);
        };
        this.parseVariables = function(input, evaluate) {
            'use strict';
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
                            varValueCode = 'context.get(\''+varName+'\',this.element).value'+varAccess;
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
        this.processCodeBlocks = function(input, element, wholeBlock, local) {
            'use strict';
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
                        const varParsedCode = context.parseVariables(code);
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
    this.update = function(element, reprocessAttributes, parentContext) {
        console.assert(element, "fin.update(element, parentContext): null `element` given");
        if(!element) return;
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
                    // fin-let-<var-name>
                    if(finCommand.indexOf(finLetPrefix) === 0) {
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
                                context.processCodeBlocks(varCode, element, true, local);
                                context.setOrNew(finLetVarName, local.value);
                            } catch(error) {
                                console.error('Error when setting variable: '+attribute.name+'='+varValueCode+'\n', error, clone);
                            }
                        } else {
                            console.error('Error invalid variable identifier: '+finLetVarName, clone);
                        }
                    // fin-on<event>
                    } else if(finCommand.indexOf(finOnPrefix) === 0) {
                        const finEventName = finCommand.substring(finOnPrefix.length);
                        const eventHandler = function(event) { 
                            const eventCode = attribute.value;
                            return context.processCodeBlocks(eventCode, element, true, {event: event}); 
                        };
                        element.addEventListener(finEventName, eventHandler);
                        const lastEventHandler = context.eventHandlers.get(finEventName);
                        element.removeEventListener(finEventName, lastEventHandler);
                        context.eventHandlers.set(finEventName, eventHandler);
                    // fin-html
                    } else if(finCommand === finHtmlPrefix) {
                        finCommand.substring(finHtmlPrefix.length);
                        const htmlCode = attribute.value;
                        const output   = context.processCodeBlocks(htmlCode, element, false); 
                        element.innerHTML = output;
                    // fin-<attribute>
                    } else if(finCommand.length > 0) {
                        const output = context.processCodeBlocks(attribute.value, element, true);
                        element.setAttribute(finCommand, output);
                    // fin-
                    } else {
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
