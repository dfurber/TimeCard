var Project = Class.create({
    key: "projects",
    init: function(options){
        // console.log('creating project');
        this.id = options.id;
        this.name = options.name;
        this.company_name = options.company_name;
        this.todo_lists = options.todo_lists;
    },
});
$.extend(Project, {
    fromXml : function(node){
        var node = $(node);
        return new Project({
            name: node.children("name").text(),
    		company_name: node.children("company").children("name").text(),
            description: node.children("announcement").text(),
            id: node.children("id").text(),
            todo_lists: []
        })
    },
	find: function(id){
	    var project;
	    $(app.projects).each(function(){
	        if (!project) {
	            if (this.id == id) {
	                project = this;
	            }
	        }
	    });  
	    return project;
	},
	saveToCache: function(){
	    Cache.put("projects", JSON.stringify(app.projects));
	},
    loadFromCache: function(){
        var raw = Cache.get("projects");
        app.projects = [];
        if (raw) {
            raw = JSON.parse(raw);
            $(raw).each(function(){
                console.log(this);
                app.projects.push(new Project(this));
            })      
            console.log(app.projects)      
        } 
    }
})

