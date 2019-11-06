<script>
import {createEventDispatcher} from 'svelte';
const dispatch=createEventDispatcher();
function seyHello(){
  dispatch('message',{text:'Hello!'})
}
</script>
<button on:click={seyHello}>Click me</button>