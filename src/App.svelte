<script>
  let numbers=[1,2,3,4];
  $:sum=numbers.reduce((t,n)=>t+n);
  
  function addNumbers(){
    numbers=[...numbers,numbers.length+1]
  }
</script>

<style>
	p {
		color: purple;
	}
</style>
<button on:click={addNumbers}>
Add numbers
</button>
<p>{numbers.join('+')}={sum}</p>