#!/usr/bin/env node

var _ = require('lodash');
var assert = require('assert');
var async = require('async');
var GitHubApi = require('github');
var prettyjson = require('prettyjson');

var gitHubOrg = process.env.GITHUB_ORG;
var gitHubToken = process.env.GITHUB_TOKEN;
var gitHubUser = process.env.GITHUB_USER;

assert(gitHubOrg != undefined && gitHubOrg != "", "pass the github org via GITHUB_ORG");
assert(gitHubToken != undefined && gitHubToken != "", "pass the github token via GITHUB_TOKEN");
assert(gitHubUser != undefined && gitHubUser != "", "pass the github user via GITHUB_USER");

var packageName = process.argv[2];

function makeRequests(gh, repos) {
  return _.map(repos, function(repo) {
    return function(cb) {
      gh.authenticate({
        type: 'basic',
        username: gitHubUser,
        password: gitHubToken
      });

      gh.repos.getContent({
        user: gitHubOrg,
        repo: repo,
        path: "/package.json"
      }, function(err, response) {
        if (err) {
          if (err.code == 404) {
            cb();
          } else {
            cb(err);
          }
        } else {
          response.repoName = repo;
          cb(null, response);
        }
      });
    };
  });
}

var github = new GitHubApi({
  version: '3.0.0',
  debug: false,
  headers: {
    'user-agent': 'sparkle'
  }
});

function getRepos(page, repos, callback) {
  github.authenticate({
    type: 'basic',
    username: gitHubUser,
    password: gitHubToken
  });

  github.repos.getFromOrg({
    org: gitHubOrg,
    per_page: 100,
    page: page
  }, function(err, response) {
    if (err) {
      console.log(err);
    } else {
      _.forEach(response, function(repo) {
        repos.push(repo.name);
      });

      if (response.meta.link.indexOf('next') >= 0) {
        getRepos(page + 1, repos, function(rs) {
          callback(rs);
        });
      } else {
        callback(repos);
      }
    }
  });
}

function aggregateRepos(repos) {
  var requests = makeRequests(github, repos);
  async.parallel(requests, function(err, responses) {
    if (err) {
      console.log(err);
    } else {
      responses = _.compact(responses);
      //get a list of tuples for repo name and it's set of dependencies
      var repoPackageTuples = _.map(responses, function(response) {
        return {
          name: response.repoName,
          deps: JSON.parse(new Buffer(response.content, 'base64').toString('utf-8')).dependencies
        };
      });

      //we have a list of all the different repos and their associated versions
      //let's make this readable.
      var packageToVersionToRepos = {};
      _.forEach(repoPackageTuples, function(tuple) {
        _.forEach(_.keys(tuple.deps), function(pack) {
          var version = tuple.deps[pack];

          if (version.match(/^[\^\~]/)) {
            version = version.substring(1, version.length);
          } else if (version.match(/^>=\s+/)) {
            version = version.replace(/^>=\s+/, '');
          }

          if (pack in packageToVersionToRepos && version in packageToVersionToRepos[pack]) {
            packageToVersionToRepos[pack][version].push(tuple.name);
          } else {
            if (pack in packageToVersionToRepos) {
              packageToVersionToRepos[pack][version] = [tuple.name];
            } else {
              packageToVersionToRepos[pack] = {};
              packageToVersionToRepos[pack][version] = [tuple.name];
            }
          }
        });
      });

      if (packageName) {
        var small = {};
        small[packageName] = packageToVersionToRepos[packageName];
        console.log(prettyjson.render(small));
      } else {
        console.log(prettyjson.render(packageToVersionToRepos));
      }
    }
  });
}

getRepos(1, [], function(repos) {
  aggregateRepos(repos);
});
