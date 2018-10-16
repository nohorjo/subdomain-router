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

    fs.watch(routeFile, () => {
        console.log('route file updated');
        routes = fs.readJsonSync(routeFile);
    });

    http.createServer((req, res) => {
        const subDomain = req.headers.host
                            .replace(/(\.[^\.]*){2}$/, '')
                            .split('.')
                            .reverse()
                            .join('.');
        const port = eval(`routes.${subDomain}`);
        proxy.web(req, res, {target: `http://localhost:${+port || port.$}`});
    }).listen(
        process.env.PORT || 80,
        () => console.log(`Server ${cluster.worker.id} started`)
    );
}
