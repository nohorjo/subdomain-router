const http = require('http');
const proxy = require('http-proxy').createProxyServer();
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const cluster = require('cluster');
const parseDomain = require('parse-domain');
const net = require('net');

const cpus = os.cpus().length;

const isPortInUse = port => new Promise((res, rej) => {
    const tester = net.createServer()
        .once('error', err => {
            if (err.code != 'EADDRINUSE') rej(err);
            else res(true);
        })
        .once('listening', () => tester.once('close', () => res(false)).close())
        .listen(port);
});

if (cluster.isMaster) {
    for (let i = 0; i < cpus; i++) {
        cluster.fork();
    }
} else {
    let routeFile = process.env.ROUTE_FILE || path.join(__dirname, 'routes.json');

    if (!fs.pathExistsSync(routeFile))
        throw `Route file does not exist at ${routeFile}`;

    let routes = fs.readJsonSync(routeFile);

    fs.watchFile(routeFile, () => {
        console.log('route file updated');
        ! function tryRead() {
            try {
                routes = fs.readJsonSync(routeFile);
            } catch (e) {
                setTimeout(tryRead, 1000);
            }
        }()
    });

    async function getTarget(req) {
        let port;
        const {
            subdomain
        } = parseDomain(req.headers.host, {
            customTlds: /localhost/
        });
        if (subdomain === '') {
            port = routes.$;
        } else {
            port = subdomain.split('.').reverse().join('.');
        }
        if (typeof port !== 'number') {
            const tested = [];
            getport: do {
                if (tested.includes(port)) break;
                tested.push(port);
                try {
                    port = eval(`routes.${port}`);
                } catch (e) {
                    port = null;
                    break;
                }
                switch (typeof port) {
                    case 'number':
                        break getport;
                    case 'object':
                        if (!port) break getport;
                        port = port.$;
                        break;
                    case 'undefined':
                        port = routes._;
                        break;
                    case 'string':
                        port = port.split('.').reverse().join('.');
                        break;
                }
            } while (true);
        }
        if (!port) throw 'not found';
        if (!await isPortInUse(port)) throw `nothing on port ${port}`;
        console.log(subdomain, port)
        return port;
    }

    const server = http.createServer(async (req, res) => {
        try {
            proxy.web(req, res, {
                target: `http://localhost:${await getTarget(req)}`
            });
        } catch (e) {
            res.statusCode = e === 'not found' ? 404 : 500;
            res.end('Error :' + e);
        }
    });

    server.on('upgrade', async (req, socket, head) => {
        try {
            proxy.ws(req, socket, head, {
                target: `ws://localhost:${await getTarget(req)}`
            });
        } catch (e) {
            console.error(e);
            socket.destroy(e);
        }
    });

    server.on('error', console.error);

    server.listen(
        process.env.PORT || 80,
        () => console.log(`Server ${cluster.worker.id} started`)
    );
}
