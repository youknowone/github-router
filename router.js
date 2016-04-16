
var rules = undefined; // not loaded yet
var rules_url = undefined;
var rules_onload = [];

function load_url(url, data, success) {
    $.getJSON(url, data, function(data) {
        var placeholders = [];
        for (var idx in data) {
            var datum = data[idx];
            if (datum == null) {
                placeholders.push(idx);
                continue;
            }
            if (datum[0].startsWith('^')) {
                datum[0] = RegExp(datum[0]);
                data[idx] = datum;
            }
        }
        placeholders.reverse();
        for (var idx in placeholders) {
            data.splice(placeholders[idx], 1);
        }
        rules = data;
        rules_url = url;
        if (success) {
            success(rules);
        }
        for (var idx in rules_onload) {
            var onload = rules_onload[idx];
            onload(rules);
        }
    });
}

function load_github(repository, branch, filename, success) {
    if (!repository) {
        throw "Pass repository name to the funciton. Name format is: `<username>/<reponame>`. ex: `youknowone/github-router`"
    }
    if (!branch) {
        branch = 'master';
    }
    if (!filename) {
        filename = 'rules.json';
    }
    var url = undefined;
    if (branch == 'gh-pages' && !repository.endsWith('.github.io')) {
        var parts = repository.split('/');
        url = 'http://' + parts[0] + '.github.io/' + parts[1] + '/' + filename;
    } else {
        url = 'https://raw.githubusercontent.com/' + repository + '/' + branch + '/' + filename;
    }
    load_url(url, {}, success);
}

function target_simple(name, rule) {
    return rule[1];
}

function target_regexp(name, rule) {
    var pattern = rule[0];
    var target = rule[1];
    var groups = pattern.exec(name);
    if (groups.length > 1) {
        return name.replace(pattern, target);
    } else {
        return target;
    }
}

function route_url(name) {
    var url = undefined;
    for (var idx in rules) {
        var rule = rules[idx];
        var pattern = rule[0];
        if (typeof(pattern) == "string" || pattern instanceof String) {
            if (pattern == name) {
                url = target_simple(name, rule);
                break;
            }
            continue;
        }
        else if (pattern instanceof RegExp) {
            if (pattern.test(name)) {
                url = target_regexp(name, rule);
                break;
            }
            continue;
        }
        else {
            console.log('unknown routing pattern type: ' + typeof(pattern) + ' of ' + pattern);
        }
    }
    return url;
}

function route(name) {
    var url = route_url(name);
    if (url) {
        location.href = url;
    } else {
        throw 404;
    }
}

function get_hash() {
    return window.location.hash.substr(1);
}

function route_onload(options, callback) {
    var load_function = undefined;
    if (typeof(options) == "string" || options instanceof String) {
        if (options.startsWith('http://') || options.startsWith('https://') || options.startsWith('.') || options.startsWith('/')) {
            options = {'url': options};
        }
        else {
            options = {'repository': options};
        }
    }

    if (!options['loader']) {
        if (options['url']) {
            load_function = function(c) { load_url(options['url'], {}, c); };
        } else {
            load_function = function(c) {
                load_github(options['repository'], options['branch'], options['filename'], c); };
        }
    }

    if (!options['name']) {
        var hash = get_hash();
        options['name'] = hash;
    }

    load_function(function(rules) {
        var name = options['name'];
        if (name == false) {
            console.log('no hash found: stopped');
            return;
        }
        var url = route_url(name);
        var result = callback(url);
        if (typeof(result) == "string" || result instanceof String) {
            url = result;
        }
        if (result != false) {
            if (url == undefined) {
                throw 404;
            }
            location.href = url;
        }
    });
}