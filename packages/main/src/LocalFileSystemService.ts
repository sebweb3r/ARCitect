import { BrowserWindow, ipcMain, dialog } from 'electron';
import PATH from 'path';
import FS from 'fs';
import FSE from 'fs-extra'
import chokidar from 'chokidar';
import util from 'util';

const changeListeners = {};

const path_to_arcitect = path => path.split(PATH.sep).join('/')
const path_to_system = path => path.split('/').join(PATH.sep)

export const LocalFileSystemService = {

  readDir: (e,path) => {
    path = path_to_system(path)
    const children = [];

    const labels = FS.readdirSync(path);
    for(const l of labels){
      const path_ = PATH.join(path,l);
      const stat = FS.lstatSync(path_);
      if(l.startsWith('isa.') || l.startsWith('.git') || l.startsWith('.arc'))
        continue;

      stat.id = path_to_arcitect(path_);
      stat.isDirectory = stat.isDirectory();
      children.push(stat);
    }

    return children;
  },

  selectDir: async (e,[title,message])=>{
    const window = BrowserWindow.getAllWindows().find(w => !w.isDestroyed())
    const result = await dialog.showOpenDialog(window, {
      title: title,
      message: message,
      properties: ['openDirectory']
    });
    const path = result.filePaths[0];
    return path ? path_to_arcitect(path) : null;
  },

  selectAny: async ()=>{
    const window = BrowserWindow.getAllWindows().find(w => !w.isDestroyed())
    const result = await dialog.showOpenDialog(window, {
      properties: ['openFile','multiSelections']
    });
    return result ? result.filePaths.map(path_to_arcitect) : null;
  },

  saveFile: async ()=>{
    const window = BrowserWindow.getAllWindows().find(w => !w.isDestroyed())
    const result = await dialog.showSaveDialog(window);
    return path_to_arcitect(result.filePath);
  },

  readFile: (e,path)=>{
    path = path_to_system(path)
    return FS.readFileSync(path,{encoding:'UTF-8'});
  },

  copy: async (e,[src,dst])=>{
    src = path_to_system(src)
    dst = path_to_system(dst)
    try {
      FSE.copySync(src, PATH.join(dst,PATH.basename(src)), { overwrite: true })
      return 1;
    } catch (err) {
      console.error(err);
      return 0;
    }
  },

  registerChangeListener: async (e,path)=>{
    path = path_to_system(path)

    changeListeners[path] = chokidar.watch(path,{ignoreInitial:true});

    const updatePath = path => {
      const window = BrowserWindow.getAllWindows().find(w => !w.isDestroyed());
      window.webContents.send('LocalFileSystemService.updatePath', path_to_arcitect(path));
    };
    const updateParentPath = path => {
      updatePath( PATH.dirname(path) );
    };

    changeListeners[path]
      // .on('all', (event, path) => {
      //   // console.log(event,path);
      // })
      .on('add', updateParentPath)
      .on('unlink', updateParentPath)
      .on('addDir', updateParentPath)
      .on('unlinkDir', updateParentPath)
    ;

    return;
  },

  unregisterChangeListener: async (e,path)=>{
    // console.log('ul',path)
    path = path_to_system(path)
    const watcher = changeListeners[path];
    if(!watcher)
      return;

    await watcher.unwatch();
    delete changeListeners[path];
    return;
  },

  createEmptyFile: async (e,path)=>{
    path = path_to_system(path)
    const fpath = (path.slice(-3)==='.md' || path.slice(-4)==='.txt') ? path : path +'.md';
    FS.writeFileSync(fpath,"");
    return fpath;
  },

  writeFile: async (e,[path,data])=>{
    path = path_to_system(path)
    return FS.writeFileSync(path,data,{encoding:'UTF-8'});
  },

  getPathSeparator: async e=>{
    return PATH.sep;
  },

  init: async () => {
    process.on('unhandledRejection', (reason, p) => {
      console.error(`Unhandled Rejection at: ${util.inspect(p)} reason: ${reason}`);
    });

    ipcMain.handle('LocalFileSystemService.readDir', LocalFileSystemService.readDir)
    ipcMain.handle('LocalFileSystemService.readFile', LocalFileSystemService.readFile)
    ipcMain.handle('LocalFileSystemService.writeFile', LocalFileSystemService.writeFile)
    ipcMain.handle('LocalFileSystemService.selectDir', LocalFileSystemService.selectDir)
    ipcMain.handle('LocalFileSystemService.selectAny', LocalFileSystemService.selectAny)
    ipcMain.handle('LocalFileSystemService.saveFile', LocalFileSystemService.saveFile)
    ipcMain.handle('LocalFileSystemService.copy', LocalFileSystemService.copy)
    ipcMain.handle('LocalFileSystemService.createEmptyFile', LocalFileSystemService.createEmptyFile)
    ipcMain.handle('LocalFileSystemService.registerChangeListener', LocalFileSystemService.registerChangeListener)
    ipcMain.handle('LocalFileSystemService.unregisterChangeListener', LocalFileSystemService.unregisterChangeListener)
    ipcMain.handle('LocalFileSystemService.getPathSeparator', LocalFileSystemService.getPathSeparator)
  }
}
