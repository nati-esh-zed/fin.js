
const ComponentStore = function(componentsDefinitionRootElement, componentClient) {
  console.assert(!!componentsDefinitionRootElement, 'componentsDefinitionRootElement must not be null');
  console.assert(componentsDefinitionRootElement instanceof HTMLElement, 'componentsDefinitionRootElement must be instanceof HTMLElement');
  console.assert(!!componentClient, 'componentClient must not be null');
  console.assert(componentClient instanceof HTMLElement, 'componentClient must be instanceof HTMLElement');
  /*----------------------------------------------*/
  const componentStore = this;
  this.componentsDefinitionRootElement = componentsDefinitionRootElement;
  this.componentClient = componentClient;
  this.components = new Map();
  /*----------------------------------------------*/
  this.get = function(componentName) {
    const component = componentStore.get(componentName);
    return component;
  };
  this.removeDefinitionElement = function() {
    const elem = componentStore.componentsDefinitionRootElement;
    elem.parentNode.removeChild(elem);
    return componentStore;
  };
  this.parseComponents = function(client) {
    console.assert(!!client, 'client must not be null');
    console.assert(client instanceof HTMLElement, 'client must be instanceof HTMLElement')
    client.querySelectorAll('*').forEach(
      function(target) {
        if(target.tagName === 'FRAGMENT') {
          const parent = target.parentNode;
          const fragment = document.createDocumentFragment();
          while(target.firstChild)
            fragment.appendChild(target.firstChild);
          parent.replaceChild(fragment, target);
        } else {
          const tagName   = target.tagName.toLowerCase();
          const component = componentStore.components.get(tagName);
          if(component) {
            const keepContent = !!target.attributes.getNamedItem('keep-content');
            if(keepContent)
              target.removeAttribute('keep-content');
            // clone the component and replace it
            const componentClone = component.cloneNode();
            componentClone.innerHTML = keepContent
              ? target.innerHTML
              : component.innerHTML;
            // override with the attributes of the target
            for(let attribute of target.attributes) {
              const attributeClone = attribute.cloneNode();
              componentClone.attributes.setNamedItem(attributeClone);
            }
            //
            target.replaceWith(componentClone);
            componentStore.parseComponents(componentClone);
          }
        }
      }
    );
  };
  /*----------------------------------------------*/
  // process and store components. Also hide them from the DOM.
  {
    componentsDefinitionRootElement.style.display = 'none';
    componentsDefinitionRootElement.querySelectorAll('[component]').forEach(
      function(component) {
        //////////////////////////////////////////////
        const givenName = component.getAttribute('component');
        console.assert(givenName.toUpperCase() === component.tagName,
          'Component '+givenName+' mismatch with tagName \''+
          component.tagName+
          '\'. please match them except casing.'
        );
        const name      = givenName === '' 
          ? component.tagName.charAt(0)+component.tagName.toLowerCase().substring(1)
          : givenName;
        const extend = component.getAttribute('extends');
        const lowerCaseExtend = extend && extend.toLowerCase();
        const extendComponent = extend && componentStore.components.get(lowerCaseExtend);
        const extendTagName   = extendComponent 
          ? extendComponent.tagName
          : 'div';
        component.removeAttribute('component');
        component.removeAttribute('extends');
        // create a new element and move the children and copy attributes
        const newComponent = document.createElement(extendTagName);
        while(component.firstChild)
          newComponent.appendChild(component.firstChild);
        for (let attribute of component.attributes)
          newComponent.attributes.setNamedItem(attribute.cloneNode());
        // set the component attribute to the name
        newComponent.setAttribute('component', name);
        newComponent.component = name;
        // add the extend chain as class names.
        newComponent.classList.add(name);
        if(extendComponent) {
          if(extendComponent.extensions)
            newComponent.extensions = [extend].concat(extendComponent.extensions);
          else 
            newComponent.extensions = [extend];
          for(let extension of newComponent.extensions)
            newComponent.classList.add(extension);
        }
        component.replaceWith(newComponent);
        // process children
        componentStore.parseComponents(newComponent);
        //////////////////////////////////////////////
        const lowerCaseName = name.toLowerCase();
        componentStore.components.set(lowerCaseName, newComponent);
      }
    );
  }
  /*----------------------------------------------*/
  this.parseComponents(this.componentClient);
};
