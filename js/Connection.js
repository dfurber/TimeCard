var Connection = Class.create({
    init: function(url, username, password) {
        this.url = url;
        this.username = username;
        this.password = password;
        this.status = null;
        this.data = null;
    },
    request : function(options) {
        options = $.extend({type: 'GET'}, options);
        this.status = null;
        var request = new air.URLRequest(this.url + options.url), self = this; 
    	request.contentType = "application/xml"; 
    	request.authenticate = false;
    	request.requestHeaders.push(new air.URLRequestHeader("Authorization", "Basic " + Base64.encode(app.username + ":" + app.password)));        
    	request.method = options.type; 
    	if (typeof options.data != "undefined") {
            if (request.method == "GET") {
        	    request.data = new air.URLVariables($.param(options.data));
            } else {
                request.data = options.data;
            }
    	}
    	var loader = new air.URLLoader(); 
        loader.addEventListener("httpResponseStatus", function(event){
            self.status = event.status;
        });
    	loader.addEventListener("complete", function(event){
    	    self.data = new DOMParser().parseFromString( loader.data, 'text/xml' ); 
    	    $(".loadindicator").hide();
        	
    	    if (self.successful()) {
    	        if (typeof options.complete == "function") {
    	            options.complete(self.data);
    	            return;
    	        }
    	        if (typeof options.success == "function") {
    	            options.success(self.data);
    	        } else {
    	            return;
    	        }
    	    } else {
    	        if (typeof options.error == "function") {
    	            options.error(self.data);
    	        } else {
    	            app.setStatus("There was an error " + self.status);
    	        }
    	    }
    	});
    	$('.loadindicator').show();
    	loader.load(request);
    },
    successful: function(){
        return (this.status == 200) || (this.status == 201);
    }
})