# fin.js

final js library for fine execution of javascript code inside HTML attributes and bodies without the script tag.

## Sample

```html
<head> 
    <script src="js/fin.1.0.0.js"></script>
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
        <p>{$message += '!'}</p>
        <p>{$message}</p>
        <p>{this.set('message', ':: '+$message)}</p>
        <p>{$message}</p>
        <p>{console.log($message); fin.zeroWidthWhiteSpace}</p>
    </main>
    <script>
        const [root, rootContext] = fin.update(document.getElementById('root'));
    </script>
</body>
```