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
    console.log(dades);

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

// Retornar una pàgina dinàmica de item /actionEdit
app.get("/edit", getItem);
async function getItem(req, res) {
  let arxiu = "./private/productes.json";
  let dadesArxiu = await fs.readFile(arxiu, { encoding: "utf8" });
  let dades = JSON.parse(dadesArxiu);
  console.log(dades);
  let query = url.parse(req.url, true).query;

  // Buscar el producto por id
  let infoFruit = dades.find((fruit) => fruit.id == query.id);
  if (infoFruit) {
    // Retornar la página según el producto encontrado
    res.render("edit.ejs", { id: query.id, infoFruit });
  } else {
    res.send("Parámetros incorrectos");
  }
}

// Ruta para la acción de edición de un producto
app.get("/item", getItemForItemRoute);
async function getItemForItemRoute(req, res) {
  let dades = {};
  res.render("edit.ejs", dades);
}


/*app.post("/actionEdit", upload.array("files"), actionEdit);
async function actionEdit(req, res) {
  try {
    const { id } = req.query; // Obtiene el valor de 'id' desde la consulta URL (?id=X)
    const postData = await getPostObject(req);

    // Aquí deberías tener la lógica para cargar el producto con el ID especificado,
    // aplicar las modificaciones según los datos recibidos del formulario,
    // incluyendo la posible actualización de la foto si se ha proporcionado una nueva.

    // Después de editar el producto, redirige al usuario a la página de edición ('edit.ejs')
    // y pasa los datos del producto editado a la vista.
    res.render("edit.ejs", { id, infoFruit: productoEditado }); // Reemplaza 'productoEditado' con los datos del producto editado.
  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno del servidor");
  }
}
*/
app.get("/delete", (req, res) => {
  const id = req.query.id; // Obtiene el valor de 'id' desde la consulta URL (?id=X)
  // Renderiza la vista de confirmación de borrado pasando el 'id' como contexto
  res.render("delete.ejs", { id }); // Reemplaza 'confirmarBorrado.ejs' con el nombre real de tu vista de confirmación de borrado
});
app.post("/actionDelete", (req, res) => {
  const id = req.query.id; // Obtiene el valor de 'id' desde la consulta URL (?id=X)

  // Realiza la acción de borrado aquí usando el 'id' recibido

  // Redirige a la página de inicio después de borrar
  res.redirect("/");
});
// Retornar una pàgina dinàmica de item
// Activar servidor.
app.listen(port, appListen);
function appListen() {
  console.log(`Example app listening on: http://localhost:${port}`);
}
