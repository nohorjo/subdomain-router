const http = require('http');
const proxy = require('http-proxy').createProxyServer();
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const cluster = require('cluster');
const parseDomain = require('parse-domain');

const cpus = os.cpus().length;

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
        !function tryRead() {
            try {
                routes = fs.readJsonSync(routeFile);
            } catch (e) {
                setTimeout(tryRead, 1000);
            }
        }()
    });

    http.createServer((req, res) => {
        let port;
        try {
            const { subdomain } = parseDomain(req.headers.host, {customTlds: /localhost/});
            if (subdomain === '') {
                port = routes.$;
            } else {
                port = subdomain.split('.').reverse().join('.');
                getport: do {
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
                        if  (!port) break getport;
                        port = port.$;
                        break;
                    case 'undefined':
                        break getport;
                    case 'string':
                        port = port.split('.').reverse().join('.');
                        break;
                    }
                } while (true);
            }
            if (!port) port = routes._;
            if (!port) throw 'not found';
            console.log(subdomain, port)
            proxy.web(req, res, {target: `http://localhost:${port}`});
        } catch (e) {
            res.statusCode = e === 'not found' ? 404 : 500;
            res.end('Error :' + e);
        }
    }).listen(
        process.env.PORT || 80,
        () => console.log(`Server ${cluster.worker.id} started`)
    );
}
