# CORS anywhere

This project acts as middleware when access fhir endpoints.
Some endpoints have cors origin policy and will forbid us to access.
To override that, we need to strip cors headers from request.

Project has restrictions and will allow only verified emails to access.
There is also allowlist of origins that can be setup from env by using `CORSANYWHERE_WHITELIST`

Some more restricting:
* `CORSANYWHERE_BLACKLIST` - Blacklist domains from accessing 
* `CORSANYWHERE_RATELIMIT` - Define rate limit for each origin
* `CORSANYWHERE_REQUIRE_HEADER` - Define required header for accessing


Since this app is tight to patient portal EHR system, providing the necessary list of allowed domain for redirect is required.
To get list of provider endpoints that are allowed to be accessed we can provide:
* Database connection though env
* Provide `json` file that has list of all endpoints

  This list is generated from dumping data from database using 

    `[ $(basename "$PWD") "==" 'piece' ] && python manage.py dumpdata core.Provider | tail -n +9 | jq '[ .[] | select(.fields.use_proxy == true) | .fields.FHIR_api_base_uri]'`

``` 
  [
    "https://hill.mmi.prod.fhir.ema-api.com/fhir/r4/",
    "https://opticalillusions.ef.prod.fhir.ema-api.com/fhir/r4/",
    ...
  ]
```

  Save dumped data into `core_provider.json` and set value `PROVIDER_JSON_FILE` in env

After restart provider list will be auto loaded.
   

