<script lang="ts" setup>
import { reactive, onMounted, watch, ref } from 'vue';

import AssayForm from '../components/AssayForm.vue';

import arcProperties from '../ArcProperties.ts';
import appProperties from '../AppProperties.ts';
import Assay from '../interfaces/Assay.ts';

const assayForm = ref(null);

const init = async ()=>{
  const assay = Assay.getAssay(appProperties.active_assay);
  if(!assay)
    return console.error('Unable to find assay:',[appProperties.active_assay,arcProperties]);

  const studies = Assay.getStudies(assay);

  const config  = {
    assayIdentifier: Assay.getIdentifier(assay),
    studies: studies
  };
  for(let p in assay)
    config[p.toLowerCase()] = typeof assay[p]==='string' ? assay[p] : assay[p].annotationValue;

  assayForm.value.init(config);
};

onMounted( init );
watch( arcProperties, init );
watch( ()=>appProperties.active_assay, init );

</script>

<template>
  <q-list>
    <AssayForm ref='assayForm' group="igroup" defaultOpened></AssayForm>
    <q-separator />
  </q-list>
</template>
