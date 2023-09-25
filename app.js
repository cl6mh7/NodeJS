const express = require("express");
const ejs = require("ejs");
const url = require("url");
const app = express();
const port = 3000;
const fs = require("fs/promises");

const multer = require('multer')
const { v4: uuidv4 } = require('uuid')

// Per configurar la llibreria que llegeix imatges o arxius rebuts des de formularis.
const storage = multer.memoryStorage() 
const upload = multer({ storage: storage })

// Ruta para la página de inicio
app.get('/', (req, res) => {
    res.send('Página de Inicio');
  });
  
  // Ruta para la página de añadir
  app.get('/add', (req, res) => {
    res.send('Página de Añadir');
  });

app.set("view engine", "ejs");

app.use(express.static("public"));

app.post('/addItem', upload.array('files'), addItem)
async function addItem (req, res) {
let arxiu = "./private/productes.json"
let postData = await getPostObject(req)
try {
    // Llegir el fitxer JSON
    let dadesArxiu = await fs.readFile(arxiu, { encoding: 'utf8'})
    let dades = JSON.parse(dadesArxiu)

    // Guardem la imatge a la carpeta 'public' amb un nom únic.
    if (postData.files && postData.files.length > 0) {
        let fileObj = postData.files[0];
        const uniqueID = uuidv4()
        const fileExtension = fileObj.name.split('.').pop()
        let filePath = `./public/${uniqueID}.${fileExtension}`
        await fs.writeFile(filePath, fileObj.content);
        
        // Guardem el nom de l'arxiu a la propietat 'imatge' de l'objecte.
        postData.imatge = filePath;
        
        // Eliminem el camp 'files' perquè no es guardi al JSON.
        delete postData.files;
    }
        dades.push(postData) // Afegim el nou objecte (que ja té el nou nom d’imatge)
        let textDades = JSON.stringify(dades, null, 4) // Ho transformem a cadena de text (per guardar-ho en un arxiu)
        await fs.writeFile(arxiu, textDades, { encoding: 'utf8'}) // Guardem la informació a l’arxiu
        res.send(`The data, ${textDades}, has been added.`)
    } catch (error) { console.error(error)
        res.send('Error when affecting data.') }
}

async function getPostObject (req) {
    return new Promise(async (resolve, reject) => {
        let objPost = { };
        
        // Process files.
        if (req.files.length > 0) { objPost.files = [] }
        req.files.forEach(file => {
            objPost.files.push({ name: file.originalname,
                content: file.buffer })
    })
    
    // Process other form fields.
    for (let key in req.body) {
        let value = req.body[key]
        
        // Check if is a number (example: "2ABC" is not a 2).
        if (!isNaN(value)) {
            let valueInt = parseInt(value)
            let valueFlt = parseFloat(value)
            if (valueInt && valueFlt) {
                if (valueInt == valueFlt) objPost[key] = valueInt
                else objPost[key] = valueFlt
            }
        } else { objPost[key] = value }}
        resolve(objPost)})
}    

// Activar servidor.
app.listen(port, appListen);
function appListen() { console.log(`Example app listening on: http://localhost:${port}`); }