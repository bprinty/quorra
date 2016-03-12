function parameterizeEditor(id, sel){
    /**
    parameterizeEditor()

    Configure ace editor for selection and bind to svg for 
    generation with cmd+enter.

    @author <bprinty@gmail.com>
    */

    var editor = ace.edit(id);
    editor.setTheme("ace/theme/chrome");
    editor.getSession().setMode("ace/mode/javascript");
    editor.commands.addCommand({
        name: 'render',
        bindKey: {win: 'Ctrl-Enter',  mac: 'Command-Enter'},
        exec: function(editor) {
            if (typeof sel != 'undefined'){
                d3.select(sel).remove();
            }
            eval(editor.getValue());
        }
    });

    return editor.getValue();
}