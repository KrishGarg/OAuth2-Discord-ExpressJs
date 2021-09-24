# Discord OAuth2 with ExpressJs and Axios

This is a sample app on how you can implement discord oauth2 on the backend.

# Clean Version

This is the clean branch with all the comments removed from index.js.
If you want to clone just this branch, you can use degit.

```
npx degit KrishGarg/OAuth2-Discord-ExpressJs#clean
```

## Environment Variables:

|   Variable    | Default | Description                                        | Required? |
| :-----------: | ------- | -------------------------------------------------- | --------- |
|   CLIENT_ID   | None    | Client ID of the application.                      | Yes       |
| CLIENT_SECRET | None    | Client Secret of the application.                  | Yes       |
|  OAUTH2_URL   | None    | OAuth2 URL of the application.                     | Yes       |
| REDIRECT_URL  | None    | {api_host}/api/discord/callback                    | Yes       |
|     SCOPE     | None    | Scoped you want to use. Example: guilds%20identify | Yes       |
|     PORT      | 3000    | The port on which the app would listen to.         | No        |

You can get all the above constants from [discord developer portal](https://discord.com/developers/applications). For detailed information on the available scopes, you can checkout the [discord documentation](https://discord.com/developers/docs/topics/oauth2#shared-resources-oauth2-scopes).

The [index.js](https://github.com/KrishGarg/OAuth2-Discord-ExpressJs/blob/master/index.js) file is well commented/documented.
