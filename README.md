# fin.js

A frontend JavaScript library to manage execution of javascript code inside HTML attributes and bodies.

## Features

- no build tool required.
- completely client-side;

- **fin-1.1**
  - provide `context` that is setup per element with the original html as input and processed html as output.
  - `variable` declarations and management per `context`/`element`. 
  
  ```html
  <div $let-count="{0}>
  ```

  - scoped `variable` lookup.

  ```html
  {$count}` `{$?count}` `{$:count++}
  ```

  - `context` bound javascript code block parsing in attributes and child nodes.
  - optimal `variable` update per referencing node.
  
  ```html
  {$:count++ /* causes update to referencing nodes */}
  ```
  
  - set attributes from processed and evaluated code blocks.
  
  ```html
  <div $id="{'eid'+$count}" $disabled="{!$?disable}">
  ```
  
  - remove attributes based on falsely values except `''`.
  - handle special attributes `$if` and `$style` with `$style` accepting both string and object values.

  ```html
  <FlexBox $style="{{ gap: '.5rem' }}"></FlexBox>
  <!--  -->
  <div $if="{$isLoggedIn}"><Dashboard></Dashboard></div>
  <div $if="{!$isLoggedIn}"><Auth></Auth></div>
  ```

  - capturing, getting and updating attributes like `variables` but as functions.
  
  ```html
  capture: <div $:value> get: ${value()} set: {$:value(10)} </div>
  ```
  
  - conditional html processing.
  
  ```html
  <div $if="{$count%2}>that is odd</div>"
  ````

- fin-components-1.0
  - provide `context-store` that to store and manage component definitions and client.
  - allow setting of component's tag type using the `is` attribute.
  - allow attribute, class-name and innerHTML `inheritance` using the `extends` attribute.

  ```html
  <MyComponent component="MyComponent" extends="BaseComponent"></MyComponent>
  ```
  
  - automatically add all inherited and self component names as css class names to the class list of the component.
  
  ```html
  <div component="MyComponent" class="MyComponent BaseComponent"></div>
  ```

  - smart innerHTML choosing and overriding between component definition and usage.

  ```html
  <Button component="Button" is="button">button</Button> 
  -> <button ...>button</button>
  <MyButton component="MyButton" extends="Button">my button</MyButton> 
  -> <button ...>my button</button>
  <MyButton>click me</MyButton> 
  -> <button ...>click me</button>
  ```

  - **powerful** when combined with `fin-1.1` using captured attributes as component parameters.

  ```html
  <!-- client -->
  <LabeledInput label="fruit" $onInput="{console.log($value())}"></LabeledInput>
  <!-- definition -->
  <LabeledInput component="LabeledInput" extends="Box" 
    $:label $:value $:type >
    <label>
      {$label() || ''}
      <input $type="{$type() || 'text'}"
        $value="{$value()}"
        $onInput="{$:value(this.output.value)}"
      ></input>
    </label>
  </LabeledInput>
  ```

- what about references? just use an `$attribute` and set an upper scope variable the the element's context using the `this` keyword. And access it using that variable elsewhere under that variable's scope.

  ```html
  <div $let-fruit>
    <LabeledInput $ref="{$:fruit = this}" label="fruit"></LabeledInput>
    <button $onClick="{console.log($fruit.output.value)}">get fruit</button>
  </div>
  ```

## Getting Started

- `fin-1.1.js` + `fin-components-1.0.js`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My First fin.js project</title>
  <!-- <link rel="stylesheet" href="css/components.css"> -->
  <script src="js/fin-components-1.0.js"></script>
  <script src="js/fin-1.1.js"></script>
</head>
<body>
  <!-- root -->
  <div id="root"></div>
  <!-- components -->
  <div id="components"></div>
  <!-- components' styles. best to use .css file -->
  <!-- <style></style> -->
  <script>
    const componentStore = new ComponentStore(
      document.getElementById('components'),
      document.getElementById('root')
    ).removeDefinitionElement();
  </script>
  <script>
    const fin = new Fin(document.getElementById('root'));
    const rootContext = fin.updateRoot();
  </script>
</body>
</html>
```

## Sample

### v1.1

`fin-1.1` + `fin-components-1.0`

![demo-out](demo-out.png)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demo</title>
  <script src="js/fin-components-1.0.js"></script>
  <script src="js/fin-1.1.js"></script>
</head>
<body>
  <!-- root -->
  <div id="root"
    $let-count="{0}"
  >
    <FlexBox $style="{{
        gap: '.5rem',
        flexDirection: 'column'
      }}"
    >
      <Flexbox>
        <CounterDec></CounterDec>
        <Display $style="{{
            width: '3rem', 
            justifyContent: 'center'
          }}"
        >{$count}</Display>
        <CounterInc></CounterInc>
      </Flexbox>
  
      <Flexbox $let-show="{true}">
        <Button $onClick="{#
            $:show = !$show;
            this.output.innerHTML = $show ? 'hide' : 'show';
          #}"
        >show</Button>
        <div $if="{$show}">
          <Display>shown</Display>
        </div>
      </Flexbox>
  
      <FlexBox $:value value="hello">
        <MInput 
          $value="{$value()}" 
          $onInput="{$:value(this.output.value)}"
        >
        </MInput>
        <Display $style="{{padding: '.5rem'}}">{$value()}</Display>
      </FlexBox>
  
      <FlexBox $style="{{ gap: '.5rem' }}">
        <Button></Button>
        <Button $onCLick="{alert('hello')}">click me</Button>
        <Button disabled>click me not</Button>
      </FlexBox>
    </FlexBox>
  </div>

  <!-- components -->
  <div id="components">
    <!-- Box -->
    <Box component="Box" is="div"></Box>
    <InlineBox component="InlineBox" is="div"></InlineBox>
    <FlexBox component="FlexBox" extends="Box"></FlexBox>
    <InlineFlexBox component="InlineFlexBox" extends="InlineBox"></InlineFlexBox>
    <!-- MInput -->
    <MInput component="MInput" is="input" 
      type="text" title="input"
    ></MInput>
    <Display component="Display" extends="InlineFlexBox"></Display>
    <!-- Button -->
    <Button component="Button" is="button" type="button" title="button">button</Button>
    <!-- Counter -->
    <Counter component="Counter" extends="Button"></Counter>
    <!-- CounterInc -->
    <CounterInc component="CounterInc" extends="Counter"
      $onClick="{$:count++}"
    >+ inc</CounterInc>
    <!-- CounterDec -->
    <CounterDec component="CounterDec" extends="Counter"
      $onClick="{$:count--}"
    >- dec</CounterDec>
  </div>
  <!-- components' styles -->
  <style>
    /* ... */
  </style>
  <script>
    const componentStore = new ComponentStore(
      document.getElementById('components'),
      document.getElementById('root')
    ).removeDefinitionElement();
  </script>
  <script>
    const fin = new Fin(document.getElementById('root'));
    const rootContext = fin.updateRoot();
</script>
</body>
</html>
```

```css
  /* <style> */
    * {
      transition: 100ms;
    }
    .Box {
      display: block;
    }
    .InlineBox {
      display: inline-block;
    }
    .FlexBox {
      display: flex;
    }
    .InlineFlexBox {
      display: inline-flex;
    }
    .MInput {
      margin: unset;
      padding: .5rem;
      border: 1px solid #7777;
    }
    .Display {
      margin: unset;
      padding: .5rem;
      border: 1px solid #7777;
      background-color: khaki;
    }
    .Button {
      margin: unset;
      padding: .5rem 1rem;
      appearance: none;
      border: 1px solid #3335;
      background-color: #f0f0f0;
      color: #333;
    }
    .Button:hover:not(:active):not(:disabled) {
      background-color: hsl(from #f0f0f0 h s calc(min(l*1.1, 1)));
    }
    .Button:disabled {
      background-color: hsl(from #f0f0f0 h s calc(l*.8));
    }
    .Counter {
      color: white;
    }
    .CounterInc {
      background-color: #079c2f;
      border-radius: 0 .5rem .5rem 0;
    }
    .CounterInc:hover:not(:active):not(:disabled) {
      background-color: hsl(from #079c2f h calc(s*.7) calc(min(l*1.4, 1)));
    }
    .CounterDec {
      background-color: #b91546;
      border-radius: .5rem 0 0 .5rem;
    }
    .CounterDec:hover:not(:active):not(:disabled) {
      background-color: hsl(from #b91546 h calc(s*.7) calc(min(l*1.4, 1)));
    }
  /* </style> */
```

### v1.0

```html
<head> 
    <title>fin-1.0 demo</title>
    <script src="js/fin-1.0.js"></script>
</head>
<body> 
    <main id="root"
        fin-let-name="Adam"
        fin-let-message="{'Hello '+$name}"
        fin-class="{'border p-2'}"
        >
        <button 
            fin-let-count="{0}" 
            fin-onclick="{this.set('count', $count+1)}"
            ><p>count: {$count}</p></button>
        <p>{$message}</p>
    </main>
    <script>
        const [root, rootContext] = fin.update(document.getElementById('root'));
    </script>
</body>
```
