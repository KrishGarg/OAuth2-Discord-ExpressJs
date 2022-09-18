if (process.env.NODE_ENV === "development") {
  require("dotenv").config();
}

/*
  Importing:
    Express for the main app.
    Axios for http api requests to the discord api.
    URLSearchParams to send data to the api.
      To know why not json, https://discord.com/developers/docs/topics/oauth2#shared-resources-oauth2-urls
    Crypto for generating random strings used to preventing duplicate auth requests and CSRF attacks
      for more information (never skimp on security!): https://discord.com/developers/docs/topics/oauth2#state-and-security
*/
const express = require("express");
const axios = require("axios").default;
const { URLSearchParams } = require("url");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const discordApi = "https://discord.com/api/v9/";
const discordApiOAuth2 = discordApi + "oauth2/";
const getTokenURI = discordApiOAuth2 + "token";

const oauth2Url = process.env.OAUTH2_URL;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;
const scope = process.env.SCOPE;

let testUserData = null;

/*
  Holds the random string that will be used to validate
  the OAuth2 authentication. In your app, you won't have
  this, because the server needs to be able to handle
  multiple users and requests simultaneously.
*/
let testUserState = null;

/*
  The entry endpoint.
*/
app.get("/", (req, res) => {
  /*
    Here we are generating a random string, which will be appended
    to the OAuth2 URL as the 'state' param.
  */
  const randomState = crypto.randomBytes(20).toString("hex");
  testUserState = randomState;
  /*
    Here we are directly redirecting the user to the OAuth2
    url (provided by discord). In your app, you can either 
    directly store the OAuth2 url in your front-end, or make 
    this endpoint return the OAuth2 url and in your front-end.
    You can redirect the user to the url on some button click too.
  */
  res.redirect(oauth2Url + `&state=${randomState}`);
});

app.get("/api/discord/callback", async (req, res) => {
  if (req.query.error) {
    res.send("The authorization process was denied.");
    return console.log(req.query.error_description);
  }

  /*
    The state param we appended to the OAuth2 URL has been forwarded
    to the response. Now we can check if the forwarded param matches
    the state param we appended. If it doesn't match, we have either
    already used it or someone attempted to perform a CSRF attack.
  */
  if (testUserState !== decodeURIComponent(req.query.state)) {
    if (testUserData) {
      return res.send(
        `You're already logged in, ${userData.username}#${userData.discriminator}! The access token will expire on ${testUserData.expiresOn}.`
      );
    } else {
      return res.redirect("/");
    }
  }
  testUserState = null;

  /*
    If it was successful, discord will redirect to this 
    endpoint, with a query parameter of code containing
    a code which we can exchange for an access token of
    the user.  
  */
  const code = req.query.code;

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", redirectUri);
  params.append("scope", scope);

  try {
    const response = await axios.post(getTokenURI, params.toString());

    const data = response.data;

    testUserData = data;

    testUserData.expiresOn = new Date(Date.now() + data.expires_in * 1000);
    testUserData.authHeader = `${data.token_type} ${data.access_token}`;

    const userDetails = await axios.get(discordApi + "users/@me", {
      headers: {
        Authorization: testUserData.authHeader,
      },
    });

    const userData = userDetails.data;

    res.send(
      `Hello ${userData.username}#${userData.discriminator}! PS: This access token will expire on ${testUserData.expiresOn}.`
    );
  } catch (err) {
    console.error(err);
  }
});

app.get("/api/discord/refresh", async (req, res) => {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", testUserData.refresh_token);

  try {
    const response = await axios.post(getTokenURI, params.toString());

    const data = response.data;

    testUserData = data;
    testUserData.expiresOn = new Date(Date.now() + data.expires_in * 1000);
    testUserData.authHeader = `${data.token_type} ${data.access_token}`;

    res.send(
      `Token has been regenerated! This access token will expire on ${testUserData.expiresOn}`
    );
  } catch (err) {
    console.error(err);
  }
});

app.listen(PORT, () => {
  console.log(`Server is listening on localhost:${PORT}`);
});
