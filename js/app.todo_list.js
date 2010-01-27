var TodoList = Class.create({
    init: function(options){
        var self = this;
        console.log('creating new todo list');
        this.id = options.id;
        this.name = options.name;
        this.completed = options.completed;
        this.project_id = options.project_id;
        this.items = [];
        if (options.items && options.items.length > 0) {
            $(options.items).each(function(){
                var item = new TodoItem(this);
                self.items.push(item);
                app.todo_items[this.id] = item;
            });
        } 
        var project = Project.find(this.project_id), has_list = false;
        if (project) {
            $(project.todo_lists).each(function(){
                if (this.id == self.id) has_list = this;
            });
            if (!has_list) {
                project.todo_lists.push(self);
            } else {
                has_list.items = has_list.items.concat(this.items);
            }
        }
    }
});

// Todo List Class Methods
$.extend(TodoList, {
    fromXml : function(node){
        var node = $(node);
        return new TodoList({
            id: node.children("id").text(),
            name: node.children("name").text(),
            completed: (node.children("completed").text() == "true"),
            project_id: node.children("project-id").text(),
            items: []
        });
    },
    fromRootNode : function(root){
        var temp_list = [], mine;
        $(root).find("todo-list").each(function(){
            console.log('found a todo list');
            var list = TodoList.fromXml(this);
            $(this).find("todo-item").each(function(){
    			var item = new TodoItem.fromXml(this);
    			list.items.push(item);
    			app.todo_items[item.id] = item;
            });
            temp_list.push(list);
        });
        for(var i=temp_list.length-1;i>=0;i--){
            app.todo_lists.push(temp_list[i]);
        }
    },
    saveToCache: function(){
        // Cache.put(JSON.stringify(app.todo_lists));
    },
    // Currently not being used...
    loadFromCache: function(){
        var raw = Cache.get("todo_lists");
        app.todo_lists = [];
        app.todo_items = [];
        $(raw).each(function(){
            app.todo_lists.push(new TodoList(this));
        })
    },
    load : function(){
        console.log("loading your todos")
		app.statusBar.set("Loading todos assigned to you.");
        var opts = $.extend({}, app.ajaxOptions);
        $.extend(opts, {
            url: app.url + "/todo_lists.xml",
            data: {'responsible_party': app.user.id},
            type: 'GET',
            success : function(root){
                TodoList.fromRootNode(root);
                TodoList.loadUnassigned();
            },
		    error : function(response){
			    console.log(response);
		    }
		});
		$.ajax(opts); // query for my todos
    },
    loadUnassigned : function(){
        console.log('loading everyones todos');
        app.statusBar.set("Loading unassigned todos.");
        var options = $.extend({}, app.ajaxOptions);
        $.extend(options, {
            type: 'GET',
            url: app.url + "/todo_lists.xml",
            data: {"responsible_party": ""},
    		error : function(){
    		    console.log('somehow this is made into a global option?');
    			app.statusBar.set("Error loading projects");	
    			console.log('error is in load unassigned');
    		},
            success : function(rootnode){
                console.log('processing everyones todos');
                TodoList.fromRootNode(rootnode);
                //              console.log('adding data to cache');
                Project.saveToCache();
                TodoList.saveToCache();
                
                app.statusBar.clear();
                app.timelog.showThisWeek();
            }
        });
        $.ajax(options); // query for unassigned todos
    }
    
})

