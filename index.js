const http = require('http');
const proxy = require('http-proxy').createProxyServer();
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const cluster = require('cluster');

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
        try {
            const subDomain = req.headers.host
                                .replace(/(\.[^\.]*){2}$/, '')
                                .split('.')
                                .reverse()
                                .join('.');
            let port = eval(`routes.${subDomain}`);
            port = +port || +port.$;
            if (!port) throw 'not found';
            proxy.web(req, res, {target: `http://localhost:${port}`});
        } catch (e) {
            switch (e) {
                case 'not found':
                    res.statusCode = 404;
                    break;
                default:
                    res.statusCode = 500;
                    break;
            }
            res.end('Error :' + e);
        }
    }).listen(
        process.env.PORT || 80,
        () => console.log(`Server ${cluster.worker.id} started`)
    );
}
