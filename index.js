if (process.env.NODE_ENV === "development") {
  require("dotenv").config();
}

/*

testing by adding comments

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

let testUserState = null;

app.get("/", (req, res) => {
  const randomState = crypto.randomBytes(20).toString("hex");
  testUserState = randomState;

  res.redirect(oauth2Url + `&state=${randomState}`);
});

app.get("/api/discord/callback", async (req, res) => {
  if (req.query.error) {
    res.send("The authorization process was denied.");
    return console.log(req.query.error_description);
  }

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
