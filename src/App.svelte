<script>
import Nested from './Nested.svelte';
import Thing from './Thing.svelte';
import Inner from './Inner.svelte';
import FancyButton from './FancyButton.svelte';

function handleMessage(e){
  alert(e.detail.text);
}
  let numbers=[1,2,3,4];
  $:sum=numbers.reduce((t,n)=>t+n);
  
  function addNumbers(){
    numbers=[...numbers,numbers.length+1]
  }
  const cats=[
    { id: 'J---aiyznGQ', name: 'Кот на клавишных' },
		{ id: 'z_AbfPXTKms', name: 'Мару' },
		{ id: 'OUtn3pvWmpg', name: 'Экзистенциальный кот' }
  ]
  const user={
    loggedIn:false,
  }
 const obj={
   id:'4211',
   name:'Svelte',
   url:'https://svelte.dev'
 }
const toggle=()=>{
  user.loggedIn=!user.loggedIn;
 }
 let things = [
		{ id: 1, color: '#0d0887' },
		{ id: 2, color: '#6a00a8' },
		{ id: 3, color: '#b12a90' },
		{ id: 4, color: '#e16462' },
		{ id: 5, color: '#fca636' }
  ];
  function handlerClick(){
    things=things.slice(1);
  }
  let m={x:0,y:0};
  const handleMouseMove=(e)=>{
    m.x=e.clientX;
    m.y=e.clientY;
  }
  function handleButtonClick(){
    alert('button is click')
  }
</script>

<style>
	p {
		color: purple;
	}
</style>
<FancyButton on:click={handleButtonClick} />
<Inner on:message />
<div on:mousemove={handleMouseMove}>
{m.x} {m.y}
</div>
{#if user.loggedIn}
  <button on:click={toggle}>
    Out
  </button>
{:else}
<button on:click={toggle}>
  In
</button>
{/if}
<ul>
{#each cats as cat,i}
  <li><a target="_blank" href='https://www.youtube.com/watch?v={cat.id}'>
    {i+1} {cat.name}
  </a></li>
{/each}
</ul>
<button on:click={addNumbers}>
Add numbers
</button>
<p>{numbers.join('+')}={sum}</p>
<Nested {...obj}/>
<button on:click={handlerClick}>
  Delete first element
</button>
{#each things as thing (thing.id)}
  <Thing current={thing.color} />
{/each}

