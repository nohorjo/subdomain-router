# subdomain-router

Proxies traffic to other localhost ports based on subdomain.

## Environment variables
* PORT - port to run the server on, default 80
* ROUTE_FILE - path to routes config file, default routes.json

## routes config file
JSON file that defines which port/mapping to redirect to for subdomain.
eg.
* my.first.sub.domain.com => 8080
* second.sub.domain.com => 8081
* sub.domain.com => 8082
* domain.com => 8083
* newdomain.com => 7000
* another.domain.com => my.first.sub.domain.com
* _anything else_ => 9999

```json
{
    "domain": {
        "$": 8083,
        "_": 9999,
        "sub": {
            "first": {
                "my": 8080
            },
            "second": 8081,
            "$": 8082
        },
        "another": "my.first.sub"
    },
    "newdomain": {
        "_": 7000
    }
}
```
