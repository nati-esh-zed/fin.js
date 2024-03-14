# fin.js

A fine JavaScript library for fine execution of javascript code inside HTML attributes and bodies.

## Sample

### v1.1

> **NOTE:** v1.1 THIS IS CURRENTLY INCOMPLETE.

```html
<head> 
    <title>fin-1.1 demo</title>
    <script src="js/fin-1.1.js"></script>
</head>
<body> 
    <main id="root"
        $let-name="Adam"
        $let-message="{'Hello '+$name}"
        $let-count="{0}"
        >
        <button $onClick="{#count++}">count: {$count}</button>
        <p>{$message}</p>
    </main>
    <script>
        const fin = new Fin(document.getElementById('root'));
        const rootContext = fin.updateRoot();
    </script>
</body>
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