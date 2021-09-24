/* 
  To load the environment variables from the .env file
  when in development, as most probably in production,
  they will be available globally.
*/
if (process.env.NODE_ENV !== "development") {
  require("dotenv").config();
}

/*
  Importing:
    Express for the main app.
    Axios for http api requests to the discord api.
    URLSearchParams to send data to the api.
      To know why not json, https://discord.com/developers/docs/topics/oauth2#shared-resources-oauth2-urls
*/
const express = require("express");
const axios = require("axios").default;
const { URLSearchParams } = require("url");

/*
  Initiating the app and declaring the port on which 
  the api will be available.
*/
const app = express();
const PORT = process.env.PORT || 3000;

/*
  Declaring some discord API endpoints' constants.
*/
const discordApi = "https://discord.com/api/v9/"; // The main discord API.
const discordApiOAuth2 = discordApi + "oauth2/"; // The endpoint for all oauth2 related requests.
const getTokenURI = discordApiOAuth2 + "token"; // The endpoint to get and refresh the access token.

/*
  Getting the values from the environment variables.
*/
const oauth2Url = process.env.OAUTH2_URL;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;
const scope = process.env.SCOPE;

/*
  Test user variable which I used to store user
  data in cache. In your app, you won't have this
  as the server would be handling multiple users.
  You would rather have user handling in the front-end.
*/
let testUserData = null;

/*
  The entry endpoint.
*/
app.get("/", (req, res) => {
  /*
    Here we are directly redirecting the user to the OAuth2
    url (provided by discord). In your app, you can either 
    directly store the OAuth2 url in your front-end, or make 
    this endpoint return the OAuth2 url and in your front-end.
    You can redirect the user to the url on some button click too.
  */
  res.redirect(oauth2Url);
});

/*
  The callback endpoint, which should be set as the redirect URL
  in your application on the discord developer portal.
  NOTE: Set the full endpoint there, for example: 
  http://localhost:3000/api/discord/callback
*/
app.get("/api/discord/callback", async (req, res) => {
  /*
    The query params will have an error parameter if there was any
    error, this can happen if the user clicked cancel after being
    redirected to the URL. You can, instead of res.send, send the
    error to the front-end.
  */
  if (req.query.error) {
    res.send("The authorization process was denied.");
    return console.log(req.query.error_description);
  }

  /*
    If it was successful, discord will redirect to this 
    endpoint, with a query parameter of code containing
    a code which we can exchange for an access token of
    the user.  
  */
  const code = req.query.code;

  /*
    Here we are defining all the necessary parameters discord 
    asks for to get an access token for the code.
  */
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", redirectUri);
  params.append("scope", scope);

  /*
    Wrapping the main requests in try-catch to catch any error.
  */
  try {
    /*
      We are sending a POST request to the /oauth2/token endpoint of 
      discord with the params we defined above.
    */
    const response = await axios.post(getTokenURI, params.toString());

    /*
      The response's shape is given in discord's docs.
      https://discord.com/developers/docs/topics/oauth2#authorization-code-grant-access-token-response
    */
    const data = response.data;

    /*
      Here I am just storing the data in the cache for testing.
      As I said earlier, in your app, you would rather send the 
      access token to the front-end.
    */
    testUserData = data;

    /*
      I added some extra properties for helping, feel free to use
      the same in your app.

      expiresOn: This is a Date object of when the current 
      access token will expire. You can use this so that in the 
      front-end, you can refresh the access token with the refresh token,
      just before this one expires so from the user's perspective, nothing
      will change. The expired_in field received is in seconds so we convert
      it to milliseconds here by multiplying it by 1000.

      authHeader: This is a string with the Authorization header string which
      would be used to make any API request on the user's behalf. You can 
      extend this by making a helper function which would attach the 
      Authorization header to your request.
    */
    testUserData.expiresOn = new Date(Date.now() + data.expires_in * 1000);
    testUserData.authHeader = `${data.token_type} ${data.access_token}`;

    /*
      Making a sample API request to discord on the authorized users 
      behalf. We are just getting the username, discriminator, id and 
      some other basic info.
      Remember that you will only have access to those endpoints,
      for which you chose the scope for.
    */
    const userDetails = await axios.get(discordApi + "users/@me", {
      /*
        Don't forget to add the Authorization header with 'Bearer {access_token}'.
      */
      headers: {
        Authorization: testUserData.authHeader,
      },
    });

    /*
      The response's shape is given in discord's docs.
      https://discord.com/developers/docs/resources/user#user-object-example-user
    */
    const userData = userDetails.data;

    /*
      Doing a res.send for the example, but as I said, you
      would rather send the data to your front-end.
    */
    res.send(
      `Hello ${userData.username}#${userData.discriminator}! PS: This access token will expire on ${testUserData.expiresOn}.`
    );
  } catch (err) {
    /*
      Throwing any error in the process in the console.
      You can use a custom logger or anything you like.
    */
    console.error(err);
  }
});

/*
  An endpoint to refresh your token. Here I used the
  local cache token, but you can take the token from
  req.body and receive it from your front-end. Some points
  to note:
    - Change this to a POST endpoint instead by replacing app.get
    with app.post.
    - At the top, just after we initialized out app, add the 
    express.json() middleware to parse the incoming json bodies.
    Like: 
    const app = express();
    app.use(express.json());
*/
app.get("/api/discord/refresh", async (req, res) => {
  /*
    Defining some required parameters for the refresh token request.
    Replace testUserData.refresh_token with the refresh token in the 4th
    parameter with the refresh token you would get from the front-end.
  */
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", testUserData.refresh_token);

  /*
    Wrapping everything in a try-catch to catch any unexpected errors.
  */
  try {
    /*
      Sending a request to the /oauth2/token endpoint but this time
      with grant_type of refresh_token so it will refresh the token.
    */
    const response = await axios.post(getTokenURI, params.toString());

    /*
      The response's shape is given in discord's docs.
      It is the same as the one we get when we request a 
      brand new access token.
      https://discord.com/developers/docs/topics/oauth2#authorization-code-grant-access-token-response
    */
    const data = response.data;

    /*
      Updating the local cache for testing purposes.
    */
    testUserData = data;
    testUserData.expiresOn = new Date(Date.now() + data.expires_in);
    testUserData.authHeader = `${data.token_type} ${data.access_token}`;

    /*
      And instead of this you would have your res.json to reply to your
      front-end with the new access token and refresh token.
      NOTE: The refresh token is a one-time use. So make sure to update
      the refresh token and the access token in the front-end.
    */
    res.send(
      `Token has been regenerated! This access token will expire on ${testUserData.expiresOn}`
    );
  } catch (err) {
    /*
      Throwing any error in the process in the console.
      You can use a custom logger or anything you like.
    */
    console.error(err);
  }
});

/*
  Starting the app on the machine to listen to
  requests on the port specified in the environment
  variables. By default its 3000.
*/
app.listen(PORT, () => {
  console.log(`Server is listening on localhost:${PORT}`);
});
