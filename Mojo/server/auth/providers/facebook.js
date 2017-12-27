var express = require('express');
var router = express.Router();
var jwt = require('jwt-simple');
var request = require('request');
var config = require('../../config');
var auth = require('../auth.service');
var User = require('../../api/user/user.model');
var GraphBaseUrl = 'https://graph.facebook.com/v2.3/';

function validationError(res, err) {
    res.status(400).json(err);
}

function fetchFB(url, token, cb) {
    request.get({url: url, qs: token, json: true}, cb);
}

/*
* Login with Facebook
* */
router.post('/', function (req, res) {
    var accessTokenUrl = 'https://graph.facebook.com/v2.3/oauth/access_token';
    var graphApiUrl = GraphBaseUrl + 'me?fields=id,first_name,last_name,picture';
    var params = {
        code: req.body.code,
        client_id: req.body.clientId,
        client_secret: config.FACEBOOK_SECRET,
        redirect_uri: req.body.redirectUri,
        scope: 'public_profile,user_birthday,user_friends,user_work_history,user_photos'

    };

    // Step 1. Exchange authorization code for access token.
    var user = null;
    request.get({url: accessTokenUrl, qs: params, json: true}, function (err, response, accessToken) {
        if (response.statusCode !== 200) {
            return res.status(500).send({message: accessToken.error.message});
        }
        console.log(accessToken);
        // Step 2. Retrieve profile information about the current user.
        fetchFB(graphApiUrl, accessToken, function (err, response, profile) {
            console.log(profile, 'response');
            if (response.statusCode !== 200) {
                return res.status(500).send({message: profile.error.message});
            }
            if (req.headers.authorization) {
                User.findOne({facebook: profile.id}, function (err, existingUser) {
                    if (existingUser) {
                        return res.status(400).send({message: 'This Facebook account is already linked to another account.'});
                    }
                    var token = req.headers.authorization.split(' ')[1];
                    var payload = jwt.decode(token, config.TOKEN_SECRET);
                    User.findById(payload.sub, function (err, db_user) {
                        user = db_user;
                        if (!user) {
                            return res.status(400).send({message: 'User not found'});
                        }
                        user.facebook = profile.id;
                        if (profile.picture && profile.picture.data.is_silhoutte === false)
                            user.picture = user.picture || profile.picture.data.url;
                        user.displayName = user.displayName || profile.name;
                        user.email = user.email || profile.email;
                        if (user.providers.indexOf('facebook') === -1) {
                            user.providers.push('facebook');
                        }
                        fetchMore(user, 'albums', accessToken, function (err) {
                            if (err)
                                return res.status(500).send({message: err});
                            user.save(function (err) {
                                if (err) {
                                    return validationError(res, err);
                                }
                                var token = auth.createJWT(user);
                                res.send({token: token});
                            });
                        });
                    });
                });
            } else {
                // Step 3b. Create a new user account or return an existing one.
                User.findOne({facebook: profile.id}, function (err, existingUser) {
                    if (existingUser) {
                        user = existingUser;
                        var token = auth.createJWT(existingUser);
                        return res.send({token: token});
                    }
                    user = new User();
                    user.facebook = profile.id;
                    if (profile.picture && profile.picture.data.is_silhoutte === false)
                        user.picture = user.picture || profile.picture.data.url;
                    user.displayName = profile.name;
                    user.email = profile.email;
                    user.providers = ['facebook'];
                    //following can be made asynchronous if needed
                    fetchMore(user, 'albums', accessToken, function (err) {
                        if (err)
                            return res.status(500).send({message: err});
                        user.save(function (err) {
                            if (err) {
                                // could not save the user, maybe email is already taken.
                                return validationError(res, err);
                            }
                            var token = auth.createJWT(user);
                            res.send({token: token});
                        });
                    });
                });
            }
        });

        //Asynchronously fetch rest of the data
        function fetchMore(user, endpoint, fb_token, cb) {
            if (endpoint == 'albums') {
                fetchFB(GraphBaseUrl + user.facebook + '/'+endpoint, fb_token, function (err, response, data) {
                    console.log('fetching albums');
                    var albums = data.data;
                    if (albums.length) {
                        console.log('fetching pictures');
                        var first = albums[0];
                        //following can be made asynchronous if needed
                        fetchFB(GraphBaseUrl + '/' + first.id + '/photos', function (err, response, data) {
                            user.albums = data;
                            console.log('albums', data);
                            cb();
                        });
                    }
                    else {
                        console.log('no albums found');
                        cb();
                    }
                    console.log(data.data, 'response');
                    if (response.statusCode !== 200) {
                        cb(data.error.message);
                    }
                });
            }
        }
    });
});
module.exports = router;