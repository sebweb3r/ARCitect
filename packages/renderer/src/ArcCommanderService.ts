import { reactive } from 'vue'

import {Loading} from 'quasar'

// Loading.hide()

import arcProperties from './ArcProperties.ts';

const ArcCommanderService = {

  init: async ()=>{
    window.ipc.on('ArcCommanderService.MSG', processMsg);
    const status = await window.ipc.invoke('ArcCommanderService.run', '--version');
    ArcCommanderService.props.ac_state = status[0] ? 1 : 0;
  },

  run: async (cmds,updateArcProperties) => {
    const responses = [];
    cmds = Array.isArray(cmds) ? cmds : [cmds];

    ArcCommanderService.props.busy = true;
    Loading.show({
      spinnerThickness: 40,
      spinnerSize: 200,
      spinnerColor: 'primary',
      delay: 200,
      message: cmds[0].title || ''
    });

    for(let cmd of cmds){
      if(cmd.silent){
        cmd.args = ['-v','0'].concat(cmd.args);
      }
      const response = await window.ipc.invoke('ArcCommanderService.run', {
        args: cmd.args,
        cwd: ArcCommanderService.props.arc_root
      });
      responses.push(response);
    }

    // while(cmds.length){
    //   const cmd = cmds.pop();
    //   if(cmd.silent){
    //     cmd.args = ['-v','0'].concat(cmd.args);
    //   }
    //   const response = await window.ipc.invoke('ArcCommanderService.run', {
    //     args: cmd.args,
    //     cwd: ArcCommanderService.props.arc_root
    //   });

    //   responses.push(response);
    // }

    if(updateArcProperties)
      await ArcCommanderService.getArcProperties();

    ArcCommanderService.props.busy = false;

    Loading.hide();

    return responses.length===1 ? responses[0] : responses;
  },

  getArcProperties: async () => {
    const response = await ArcCommanderService.run({
      args: ['export'],
      title: 'Fetching ARC-JSON',
      silent: true
    });
    if(!response[0])
      return;

    // enforce keys exist
    const keys = Object.keys(arcProperties);
    const json = JSON.parse(response[1]);
    for(let k of keys){
      arcProperties[k] = json.hasOwnProperty(k) ? json[k] : ['people','publications'].includes(k) ? [] : '';
    }
  }
};

ArcCommanderService.props = reactive({
  json: {},
  arc_root: '',
  ac_state: -1, // -1: unchecked; 0: missing; 1: ready
  busy: false,
  log: []
});

// Logging
const processMsg = async msgs=>{
  if(typeof msgs === 'string' || msgs instanceof String){
    for(let msg of msgs.split('\n')){
      msg = msg.trim();
      if(msg){
        ArcCommanderService.props.log.push(msg);
        console.log('|',msg);
      }
    }
  } else {
    console.log(msgs);
  }
};

export default ArcCommanderService;
