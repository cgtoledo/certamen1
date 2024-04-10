
import express from 'express'
import bodyParser from 'body-parser'
import { scrypt, randomBytes, randomUUID } from 'node:crypto'


const app = express()
app.use(bodyParser.json());

const users = [{
	username: 'admin',
	name: 'Gustavo Alfredo Marín Sáez',
	password: '1b6ce880ac388eb7fcb6bcaf95e20083:341dfbbe86013c940c8e898b437aa82fe575876f2946a2ad744a0c51501c7dfe6d7e5a31c58d2adc7a7dc4b87927594275ca235276accc9f628697a4c00b4e01' // certamen123
}]

let todos = []  // se inica una matriz vacía 'todos'

// establece el middleware para servir archivos estáticos desde el directorio 'public'
app.use(express.static('public'))

// funcion asincrónica para validar la contraseña
async function validarContraseña(contraseña, hashAlmacenado) {

const [salt, hash] = hashAlmacenado.split(':'); // divide el hash almacenado en sal y hash
  // genera el hash a partir de la contraseña y la sal y se compara con el hash almacenado
const hashRecreado = await generarHash(contraseña, Buffer.from(salt, 'hex'));
    return hashRecreado === hash;// retorna true si los hashes coinciden, de lo contrario false
   
}
async function generarHash(contraseña, salt) { // Función asincrónica para generar el hash
    return new Promise((resolve, reject) => {
        //utiliza la función de hash 'scrypt' para generar el hash a partir de la contraseña y la sal
        scrypt(contraseña, salt, 64, (err, derivedKey) => {
            if (err) reject(err);
			// resuelve con el hash derivado en formato hexadecimal
            resolve(derivedKey.toString('hex')); 
        });
    });
}
function generarBearerToken(username) { // genera el token de portador
    const tokenData = {
        username: username
    };
    return JSON.stringify(tokenData); // devuelve los datos del token en formato JSON
}


// Su código debe ir aquí...

function validateMiddleware(req, res, next) { // Middleware de validación
    const authHeader = req.headers['x-authorization']; // obtiene el encabezado de autorización
    if (authHeader && authHeader.trim() !== '') { // si encabezado de autorización existe y no está vacío
        try {
			// Se intenta parsear el encabezado como JSON
            const jsonObject = JSON.parse(authHeader); 
            usuario = jsonObject.username; // Se obtiene el nombre de usuario del JSON
        } catch (error) {
            console.error(error.message);
			 // devuelve un error 401 si hay un error al parsear el JSON
            return res.status(401).send();
        }
    } else {
		// devuelve un error 401 si no hay encabezado de autorización
        return res.status(401).send(); 
    }


    
    const userIndex = users.findIndex((u) => u.username == usuario)

    if (userIndex == -1) {
        console.log(" error en la validacion")
        return res.status(401).send();
    } else {
        console.log()
        next();
    }
}

// hello

app.get('/api', (req, res) => { // Ruta para responder con un saludo
    res.contentType('text/plain');// formato texto plano
    res.status(200).send('Hello World!');//muestra el  mensaje
})

// login

app.post('/api/login', async (req, res) => { // Ruta para el inicio de sesión
    res.contentType('application/json');

// Se obtienen el nombre de usuario y la contraseña de la solicitud
    const { username: usuarioInput, password: passwordInput } = req.body; 

    if (!usuarioInput?.trim())
	// Si el nombre de usuario está vacío, se devuelve un error 400
        return res.status(400).send("Usuario es inválido"); 
    if (!passwordInput?.trim())
	// Si la contraseña está vacía, se devuelve un error 400
        return res.status(400).send("Contraseña es inválida"); 

    const indiceUsuario = users.findIndex((user) => user.username == usuarioInput); // Se busca el índice del usuario en la matriz de usuarios

    if (indiceUsuario == -1) { // Si no se encuentra el usuario
        res.status(401).send("El usuario y/o contraseña son inválidos"); // devuelve un error 401
    } else {
        try {
			 // valida la contraseña
            const isValidCredentials = validarContraseña(passwordInput, users[indiceUsuario].password);
            if (!isValidCredentials) {
				// Si  credenciales no son válidas, se devuelve un error 401
                res.status(401).send("El usuario y/o contraseña son incorrectos"); 
            } else {
                const resultado = { // Si credenciales son válidas, se prepara la respuesta con el nombre de usuario y un token de portador
                    username: users[indiceUsuario].username,
                    name: users[indiceUsuario].name,
                    token: generarBearerToken(users[indiceUsuario].username)
                }
                res.status(200).send(resultado); // devuelve la respuesta con el estado 200 y los datos del usuario
            }
        } catch (err) {
            console.log(err); // Si hay un error, se imprime en la consola
        }
    }
})

// listar elitem 

app.get("/api/todos", (req, res) => { // Ruta para listar todos los elementos
    res.contentType('application/json');

// mapea cada elemento en 'todos' para obtener solo los campos necesarios
    let listar = todos.map(element => ({ 
        id: element.id,
        title: element.title,
        completed: element.completed
    }));

    res.status(200).json(listar); // Se devuelve la lista con el estado 200
})

// creacoion de item


// Creación de un nuevo elemento (item) en la lista de todos
app.post("/api/todos", (req, res) => {
    res.contentType('application/json');
    
    try {
        const title = req.body.title; // Se obtiene el título del elemento de la solicitud

        const todo = { // Se crea un nuevo objeto 'todo' con un ID generado aleatoriamente, el título proporcionado y marcado como no completado
            id: randomUUID().toString(), // Generación de un ID único para el nuevo elemento
            title: title, // Título del nuevo elemento
            completed: false // Estado de completado inicialmente establecido en falso
        }

        todos.push(todo); // Se agrega el nuevo elemento a la lista 'todos'

        res.status(201).send(todo); // Se responde con el nuevo elemento creado y un código de estado 201 (creado)
    } catch (err) {
        res.status(400); // Si hay un error, se devuelve un código de estado 400 (solicitud incorrecta)
    } 
})

// Actualización de un elemento existente
app.put("/api/todos/:id", (req, res) => {
    res.contentType('application/json');

    const id = req.params.id; // Se obtiene el ID del elemento de la solicitud
    const title = req.body.title; // Se obtiene el nuevo título del elemento de la solicitud
    const completed = req.body.completed; // Se obtiene el nuevo estado de completado del elemento de la solicitud

    try {
        const todoIndex = todos.findIndex(todo => todo.id == id); // Se encuentra el índice del elemento con el ID dado

        const todo = { // Se crea un nuevo objeto 'todo' con el mismo ID, pero con el título y estado de completado actualizados
            id: id, // Se mantiene el mismo ID
            title: title || todos[todoIndex].title, // Si no se proporciona un nuevo título, se conserva el anterior
            completed: completed || todos[todoIndex].completed // Si no se proporciona un nuevo estado de completado, se conserva el anterior
        };

        todos[todoIndex] = todo; // Se actualiza el elemento en la lista 'todos' con el nuevo objeto 'todo'

        return res.status(200).send(todo); // Se responde con el elemento actualizado y un código de estado 200 (éxito)
    } catch (error) {
        return res.status(400).send(); // Si hay un error, se devuelve un código de estado 400 (solicitud incorrecta)
    }
})

// Eliminación de un elemento existente
app.delete("/api/todos/:id", (req, res) => {
    const id = req.params.id; // Se obtiene el ID del elemento a eliminar de la solicitud

    try {
        const todoIndex = todos.findIndex(todo => todo.id == id); // Se encuentra el índice del elemento con el ID dado
        todos.splice(todoIndex, 1); // Se elimina el elemento de la lista 'todos'

        return res.status(204).send(); // Se responde con un código de estado 204 (sin contenido) para indicar que la eliminación se realizó con éxito
    } catch (error) {
        return res.status(404).send(); // Si hay un error, se devuelve un código de estado 404 (no encontrado)
    }
})


// ... hasta aquí

export default app
