function getQueryParams(qs) {
    qs = qs.split('+').join(' ');

    var params = {},
        tokens,
        re = /[?&]?([^=]+)=([^&]*)/g;

    while (tokens = re.exec(qs)) {
        params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
    }

    return params;
}

function getBaseUrl() {
	return [location.protocol, '//', location.host, location.pathname].join('');
}

function createQueryStr(params) {
	return Object.keys(params).map(function(param) {
		return param + '=' + params[param];
	}).join('&');
}

