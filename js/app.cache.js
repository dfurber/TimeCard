// JavaScript Document
var Cache = {
	put: function(key, datastring){
	    var bytes = new air.ByteArray();
	    bytes.writeUTFBytes(datastring);
	    air.EncryptedLocalStore.setItem(key, bytes);
	},
 
	get: function(key){
	    var value = air.EncryptedLocalStore.getItem(key);
	    if(value){
	        return value.readUTFBytes(value.length);
	    }
	},
	
	remove: function(key){
		air.EncryptedLocalStore.removeItem(key);
	},
	
	reset: function() {
		air.EncryptedLocalStore.reset();	
	}
					 
};
