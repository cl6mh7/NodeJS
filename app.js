const express = require("express");
const ejs = require("ejs");
const url = require("url");
const app = express();
const port = 3000;
const fs = require("fs/promises");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
// Per configurar la llibreria que llegeix imatges o arxius rebuts des de formularis.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
//Dependencia ejs
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
//?
app.use(express.static("public"));


// Ruta para la página de inicio
app.get("/", async (req, res) => {
  try {
    const { id } = req.query;
    const data = await fs.readFile("./private/productes.json", "utf-8");
    const products = JSON.parse(data);

    let filteredProducts = products;

    if (id) {
      filteredProducts = filteredProducts.filter(
        (products) => products.id === id
      );
    }
    // Ordenar la lista de productos por ID
    filteredProducts.sort((a, b) => a.id - b.id);
    res.render("inici.ejs", { products: filteredProducts });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno del servidor");
  }
});

// Ruta para la página de añadir
app.get("/add", (req, res) => {
  res.render("add.ejs");
});

//Ruta para la acción de añadir un producto
app.post("/actionAdd", upload.array("files"), addItem);
async function addItem(req, res) {
  let arxiu = "./private/productes.json";
  let postData = await getPostObject(req);
  try {
    // Llegir el fitxer JSON
    let dadesArxiu = await fs.readFile(arxiu, { encoding: "utf8" });
    let dades = JSON.parse(dadesArxiu);
    // Guardem la imatge a la carpeta 'public' amb un nom únic.
    if (postData.files && postData.files.length > 0) {
      let fileObj = postData.files[0];
      const uniqueID = uuidv4();
      const fileExtension = fileObj.name.split(".").pop();
      let filePath = `./public/${uniqueID}.${fileExtension}`;
      await fs.writeFile(filePath, fileObj.content);
      // Guardem el nom de l'arxiu a la propietat 'imatge' de l'objecte.
      postData.imatge = filePath;
      // Eliminem el camp 'files' perquè no es guardi al JSON.
      delete postData.files;
    }
    dades.push(postData); // Afegim el nou objecte (que ja té el nou nom d’imatge)
    let textDades = JSON.stringify(dades, null, 4); // Ho transformem a cadena de text (per guardar-ho en un arxiu)
    await fs.writeFile(arxiu, textDades, { encoding: "utf8" }); // Guardem la informació a l’arxiu
    await res.redirect("/");
    res.send(`The data, ${textDades}, has been added.`);
  } catch (error) {
    console.error(error);
    res.send("Error when affecting data.");
  }
}

// Ruta per a la pagina d' edit segons la id de la URL
app.get("/edit", getItem);
async function getItem(req, res) {
  let arxiu = "./private/productes.json";
  let dadesArxiu = await fs.readFile(arxiu, { encoding: "utf8" });
  let dades = JSON.parse(dadesArxiu);
  let query = url.parse(req.url, true).query; 
  // Buscar el producto por id
  let infoClothes = dades.find((fruit) => fruit.id == query.id);
  console.log("Consola -------->" + infoClothes);
  if (infoClothes) {
    // Retornar la página según el producto encontrado
    res.render("edit.ejs", { id: query.id, infoClothes });
  } else {
    res.send("Parámetros incorrectos");
  }
}

//Ruta per l' acció d' editar un producte segons l' id de la URL
app.post("/actionEdit", upload.array("files"), async (req, res) => {
  try {
    const postData = await getPostObject(req);
    const id = postData.id; // Obtenir l' ID del productr desde el formulari
    // Llegir les dades actuals dels productes desde l' arxiu JSON
    const arxiu = "./private/productes.json";
    const dadesArxiu = await fs.readFile(arxiu, { encoding: "utf8" });
    const dades = JSON.parse(dadesArxiu);
    let query = url.parse(req.url, true).query;

    // Buscar el producte per id
    let infoClothes = dades.find((pice) => pice.id == query.id);
    if (!infoClothes) {
      // Mostrar error si no es troba l' ID
      res.status(404).send("ID no encontrado en la base de datos");
      return;
    }
    // Actualitzar les dades del producte amb les dades del formulari
    infoClothes.nom = postData.nombre || infoClothes.nom;
    infoClothes.preu = postData.precio || infoClothes.preu;
    infoClothes.descripcio = postData.descripcion || infoClothes.descripcio;
    // Guardar la llista actualizada dels productes en l'arxiu JSON
    await fs.writeFile(arxiu, JSON.stringify(dades, null, 4), "utf8");
    // Redirigir al usuari a la página de inici després de editar
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno del servidor");
  }
});

// Ruta per la pagina de esborrar
app.get("/delete", getDeleteConfirmation);
async function getDeleteConfirmation(req, res) {
  try {
    const { id } = req.query;
    const arxiu = "./private/productes.json";
    const dadesArxiu = await fs.readFile(arxiu, { encoding: "utf8" });
    const dades = JSON.parse(dadesArxiu);
    console.log("Consola ------> " + dades);
    const infoClothes = dades.find((pice) => pice.id == id);

    if (infoClothes) {
      // Renderitza la vista de confirmació de esborrat amb les dades del producte
      res.render("delete.ejs", { id, infoClothes });
    } else {
      res.send("Producte no trobat");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error intern del servidor");
  }
}

// Ruta per l' acción de eliminació de un producte
app.post("/actionDelete", deleteProduct);
async function deleteProduct(req, res) {
  try {
    const { id } = req.query; // Obtenir l' ID del producte desde la consulta URL (?id=X)

    // Llegir l' arxiu JSON de productes
    const data = await fs.readFile("./private/productes.json", "utf-8");
    const products = JSON.parse(data);
    console.log("Consola actionDelete ------>" + products);

    // Buscar l' índex del producte per ID
    const productIndex = products.findIndex((product) => product.id == id);

    if (productIndex >= 0) {
      // Eliminar el producte trobat pel seu índex
      products.splice(productIndex, 1);

      // Guardar la llista actualitzada de productes en l' arxiu JSON
      await fs.writeFile(
        "./private/productes.json",
        JSON.stringify(products, null, 4),
        "utf8"
      );

      // Redirigir a l' usuari a la página de inici despres de esborrar
      res.redirect("/");
    } else {
      res.send("Producto no encontrado");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno del servidor");
  }
}

async function getPostObject(req) {
  return new Promise(async (resolve, reject) => {
    let objPost = {};

    // Process files.
    if (req.files.length > 0) {
      objPost.files = [];
    }
    req.files.forEach((file) => {
      objPost.files.push({ name: file.originalname, content: file.buffer });
    });

    // Process other form fields.
    for (let key in req.body) {
      let value = req.body[key];

      // Check if is a number (example: "2ABC" is not a 2).
      if (!isNaN(value)) {
        let valueInt = parseInt(value);
        let valueFlt = parseFloat(value);
        if (valueInt && valueFlt) {
          if (valueInt == valueFlt) objPost[key] = valueInt;
          else objPost[key] = valueFlt;
        }
      } else {
        objPost[key] = value;
      }
    }
    resolve(objPost);
  });
}

// Ruta para l' acció d' edició d' un producte
app.get("/item", getItemForItemRoute);
async function getItemForItemRoute(req, res) {
  let dades = {};
}

// Activar servidor.
app.listen(port, appListen);
function appListen() {
  console.log(`Example app listening on: http://localhost:${port}`);
}
