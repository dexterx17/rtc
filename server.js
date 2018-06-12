//libreria de servidor websocket
var ws = require("nodejs-websocket");


//Info de servidor
var ipServer = "0.0.0.0";
var puertoServer = 9000;

var emisorStreaming;

//Creamos y configuramos el WebSocket
var server = ws.createServer(function(conexion) {
    console.log('Nuevo alias conectado');

    conexion.on("text", function(msg) {
        console.log(' -------- text --------');
        console.log(msg);

        if (msg === "arsi2018") {
            emisorStreaming = conexion;
        }
        try {
            var json = JSON.parse(msg);

            if (json.type) {
                switch (json.type) {
                    case 'offer':
                        console.log(' ==== ofer ');
                        broadcast(msg);
                        break;
                    case 'answer':
                        console.log(' ==== answer ');
                        broadcast(msg);
                        break;
                }
            }
            if (json.candidate) {
                console.log(' ==== candidate ');
                //broadcast(msg);
                server.connections.forEach(function(connection) {
                    if (connection != null && connection != conexion) {
                        connection.sendText(msg)
                    }
                })
            }
        } catch (e) {
            console.log('JSON malformado');
        }


    });

    conexion.on("close", function(code, reason) {
        console.log(' -------- close --------');
    });

    conexion.on('error', function(e) {
        console.log(' -------- error --------');
        console.log(e);
    });
    //Arrancamos el servidor WebSocket en la ip y puerto configurado al inicio
}).listen(puertoServer, ipServer);

function broadcast(str) {
    server.connections.forEach(function(connection) {
        if (connection != null) {
            connection.sendText(str)
        }
    })
}