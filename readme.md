# subdomain-router

Proxies traffic to other localhost ports based on subdomain.

## Environment variables
* PORT - port to run the server on, default 80
* ROUTE_FILE - path to routes config file, default routes.json

## routes config file
JSON file that defines which port to redirect to for subdomain.
eg.
* my.first.sub.domain.com => 8080
* second.sub.domain.com => 8081
* sub.domain.com => 8082

```json
{
    "sub": {
        "first": {
            "my": 8080
        },
        "second": 8081,
        "$": 8082
    }
}
```
