# nodeVersionRepoSparkleMagic
Lots of nodejs projects? Lots of shared deps? Lots of package.json's?

Want a way to get all of them and get all of the various versions?

Run this tool.

How to run this thing:
======================
```
GITHUB_USER=<your username> GITHUB_TOKEN=<api token> GITHUB_ORG=<org to pull all the repos> sparkle [package name]
```

If you leave out the [package name] portion it will retreive any thing with a _package.json_ in it and print everything out else if you
do provide a [package name] then it will only print out that portion.

Make sure the token has org access and repo access and that should just about do it.

Example Output
==============
```
... sparkle async

async:
  1.5.1:
    - super-fresh-async-project
  0.9.2:
    - vintage-async-project
  1.2.1:
    - middle-child-project
```
