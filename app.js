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

//-------RUTAS---------------------------------

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

//Añade un
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

// Retornar una pàgina dinàmica de item /actionEdit
app.get("/edit", getItem);
async function getItem(req, res) {
  let arxiu = "./private/productes.json";
  let dadesArxiu = await fs.readFile(arxiu, { encoding: "utf8" });
  let dades = JSON.parse(dadesArxiu);
  let query = url.parse(req.url, true).query;
  
  // Buscar el producto por id
  let infoFruit = dades.find((fruit) => fruit.id == query.id);
  console.log("Consola -------->"+ infoFruit);

  if (infoFruit) {
    // Retornar la página según el producto encontrado
    res.render("edit.ejs", { id: query.id, infoFruit });
  } else {
    res.send("Parámetros incorrectos");
  }
}

app.post("/actionEdit", upload.array("files"), async (req, res) => {
  try {
    const postData = await getPostObject(req);
    const id = postData.id; // Obtener el ID del producto desde el formulario
    // Leer los datos actuales de los productos desde el archivo JSON
    const arxiu = "./private/productes.json";
    const dadesArxiu = await fs.readFile(arxiu, { encoding: "utf8" });
    const dades = JSON.parse(dadesArxiu);
    let query = url.parse(req.url, true).query;

    // Buscar el producto por id
    let infoFruit = dades.find((fruit) => fruit.id == query.id);
    if (!infoFruit) {
      // Redirigir al usuario a la página de inicio si el producto no se encuentra
      res.status(404).send('ID no encontrado en la base de datos');
      return;
    }

    // Actualizar los datos del producto con los datos del formulario
    infoFruit.nom = postData.nombre || infoFruit.nom;
    infoFruit.preu = postData.precio || infoFruit.preu;
    infoFruit.descripcio = postData.descripcion || infoFruit.descripcio;

    // Guardar la lista actualizada de productos en el archivo JSON
    await fs.writeFile(arxiu, JSON.stringify(dades, null, 4), "utf8");

    // Redirigir al usuario a la página de inicio (inici.ejs) después de editar
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno del servidor");
  }
});

// Ruta para la confirmación de borrado
app.get("/delete", getDeleteConfirmation);
async function getDeleteConfirmation(req, res) {
  try {
    const { id } = req.query;
    const arxiu = "./private/productes.json";
    const dadesArxiu = await fs.readFile(arxiu, { encoding: "utf8" });
    const dades = JSON.parse(dadesArxiu);
    console.log("Consola ------> " + dades)
    const infoFruit = dades.find((fruit) => fruit.id == id);
    

    if (infoFruit) {
      // Renderiza la vista de confirmación de borrado con los datos del producto
      res.render("delete.ejs", { id, infoFruit });
    } else {
      res.send("Producto no encontrado");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno del servidor");
  }
}

// Ruta para la acción de eliminación de un producto
app.post("/actionDelete", deleteProduct);
async function deleteProduct(req, res) {
  try {
    const { id } = req.query; // Obtener el ID del producto desde la consulta URL (?id=X)

    // Leer el archivo JSON de productos
    const data = await fs.readFile("./private/productes.json", "utf-8");
    const products = JSON.parse(data);
    console.log("Consola actionDelete ------>" + products);

    // Buscar el índice del producto por ID
    const productIndex = products.findIndex((product) => product.id == id);

    if (productIndex >= 0) {
      // Eliminar el producto encontrando por su índice
      products.splice(productIndex, 1);

      // Guardar la lista actualizada de productos en el archivo JSON
      await fs.writeFile(
        "./private/productes.json",
        JSON.stringify(products, null, 4),
        "utf8"
      );

      // Redirigir al usuario a la página de inicio después de borrar
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

// Ruta para la acción de edición de un producto
app.get("/item", getItemForItemRoute);
async function getItemForItemRoute(req, res) {
  let dades = {};
}

// Activar servidor.
app.listen(port, appListen);
function appListen() {
  console.log(`Example app listening on: http://localhost:${port}`);
}