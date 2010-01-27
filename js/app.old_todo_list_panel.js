// This code powered the todos panel that was never used and not much developed
// removed here on 1/19/2010 to get it out of the way...
renderTodoListsForProject : function(project){
    var elm = $('#todo_list_content'), 
        list_count = project.todo_lists.length,
        item_count = 0; //, my_items_count = 0;
    $(project.todo_lists).each(function(){
        item_count += this.items.length;
        // $(this.items).each(function(){
        //     if (this.mine) my_items_count += 1;
        // })
    })
    if (item_count){
        // elm.append("<a style=\"float:right\" href=\"#\" onclick=\"this.refreshTodoList(" + project.id + ");return false;\">Refresh</a>");
        elm.append("<h3>" + project.name + " (" + item_count + " todos on " + list_count + " lists)</h3>");
        var div = $('<div id="todo_project_' + project.id + '" style="display:none"></div>');
        app.renderTodoListContents(project.todo_lists, div);
        elm.append(div);
		elm.find("h3").bind("click", function(){$('#todo_project_' + project.id).slideToggle();});
    }        
},
renderTodoListContents : function(lists, div) {
    $(lists).each(function(){
        var h4 = $("<h4>" + this.name + "</h4>"), items_completed = true;
        div.append(h4);
        var subdiv = $("<ol></ol>");
        $(this.items).each(function(){
			subdiv.append(this.toHtml());
        });
        if (items_completed) h4.addClass("completed");
        div.append(subdiv);
    });
    div.find("h4").bind("click", function(){$(this).next("ol").slideToggle();})
    
},
refreshTodoList : function(id){
    var project, index;
    for(i in app.projects)
        if (app.projects[i].id == id) {
            project = app.projects[i];
            index = i;
        }
    if (project) {
        var div = $('#todo_project_' + id);
        div.html('').addClass("loading");
        var todos = app.loadTodosForProject(id);
        app.renderTodoListContents(todos, div);
        app.projects[index].todo_lists = todos;
        Cache.put("projects", JSON.stringify(app.projects));
    }
},
