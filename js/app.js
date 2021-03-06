const TAB_SIZE = 2;
const FILE_MANAGER = new LocalStorageFileManager();
const MD = new window.remarkable.Remarkable("full", {
  html: true,
  xhtmlOut: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(lang, str).value;
      } catch (err) {}
    }

    try {
      return hljs.highlightAuto(str).value;
    } catch (err) {}

    return ""; // use external default escaping
  },
});

const app = new Vue({
  el: "#md-notepad",
  data: {
    mounted: false,
    files: [],
    activeFile: null,
    activeFileEditor: null,
    activeFileContent: '',
    editorRendered: false,
    config: {
      activeFileEditorFontSize: 12
    }
  },
  mounted() {
    const configJSON = FILE_MANAGER.readFile('md-notepad-config.json');
    if (configJSON?.length) {
      this.config = JSON.parse(configJSON);
    }

    this.files = this.listFiles();
    this.activeFileEditor = ace.edit(document.getElementById('editor-input'), {
      theme: "ace/theme/tomorrow_night_eighties",
      mode: "ace/mode/markdown",
      wrap: true,
      autoScrollEditorIntoView: true,
      showPrintMargin: false,
      tabSize: TAB_SIZE
    });
    this.activeFileEditor.session.on('change', this.onUpdate);
    this.activeFileEditor.renderer.on("afterRender", this.onEditorRender);
    this.mounted = true;
    if (this.files.length) {
      let fileNameToOpen = this.files.length ? this.files[0].name : undefined;
      for (let i = 1; i < this.files.length; i++) {
        if (this.files[i].name === this.config.lastOpenedFileName) {
          fileNameToOpen = this.config.lastOpenedFileName;
          break;
        }
      }
      if (fileNameToOpen) {
        this.openFile(fileNameToOpen);
      }
    }
  },
  methods: {
    listFiles() {
      return FILE_MANAGER.listFiles().filter(f => f.name !== 'md-notepad-config.json');
    },
    onEditorRender() {
      setTimeout(function() {
        if (!this.editorRendered) {
          this.editorRendered = true;
          document.getElementById('editor-input').classList.remove('invisible');
        }
      }, 500);
    },
    createNewFile() {
      let fileName = prompt('File name? Make it awesome :)');
      fileName = fileName ? fileName.trim() : fileName;
      if (fileName && fileName.length) {
        if (!fileName.endsWith('.md') && !fileName.endsWith('.markdown')) {
          fileName = fileName + '.md';
        }
        const fileMetadata = { name: fileName, lastEdit: { dateTime: 0 } };
        FILE_MANAGER.saveFile(fileMetadata, '');
        this.files = this.listFiles();     
        this.openFile(fileName);
      }
    },
    openFile(fileName) {
      this.activeFile = this.files.filter(f => f.name === fileName)[0];
      const value = FILE_MANAGER.readFile(this.activeFile.name);
      this.activeFileEditor.setValue(value, -1);
      this.onUpdate();
      this.config.lastOpenedFileName = this.activeFile.name;
      this.saveConfig();
    },
    onUpdate() {
      const value = this.activeFileEditor.getValue();
      FILE_MANAGER.saveFile(this.activeFile, value);
      this.activeFileContent = MD.render(value).replace(/\<table\>/g, '<table class="table table-bordered table-striped">');
    },
    deleteFile(fileName) {
      FILE_MANAGER.deleteFile(fileName);
      this.files = this.listFiles();
      if (fileName === this.activeFile?.name) {
        this.activeFileContent = '';
        this.activeFile = null;
        this.activeFileEditor.setValue('', -1);
      }
    },
    saveConfig() {
      const metadata = {
        name: 'md-notepad-config.json',
        lastEdit: { dateTime: 0 }
      };
      FILE_MANAGER.saveFile(metadata, JSON.stringify(this.config));
    }
  }
});
