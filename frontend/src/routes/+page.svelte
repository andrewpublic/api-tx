<script lang="ts">
	import BankFormInput from '$lib/components/BankFormInput.svelte';
  import { GradientButton } from 'flowbite-svelte';

  let bankApiKey = "";
  let promise: any;

  // https://www.sveltesociety.dev/recipes/component-recipes/using-fetch-to-consume-apis
  function sendBankApiKey() {
    promise = fetch('http://localhost:8080', {
      method: 'POST',
      body: JSON.stringify({bankApiKey})
    }) 
    .then(response => response.json());
  }
</script>

<head>
  <title>API TX (working title)</title>
</head>

<div class="container mx-auto py-8">
  <h1>Welcome!</h1>
  <div class="py-8">
    
    API TX is a finance assistant helping you to keep track of your spend automatically.
    <br />
    We are integrated with Up Bank!
    <p class="py-2"/>
    If you aren't signed up with Up Bank, try it now!

    <div class="py-8">
      <BankFormInput bind:bankApiKey={bankApiKey} />
    </div>
    <div>
      <GradientButton on:click={sendBankApiKey} outline color="redToYellow" class="w-72">Submit!</GradientButton>
    </div>
  </div>
  <div>
    {#await promise}
      waiting for response...
    {:then data}
      <pre>
        {JSON.stringify(data, null, 2)} <!-- ...null == replacer function... 2 == whitespace... essentially a formatting hack-->
      </pre>
    {:catch error}
      AHH error!
      {error}
    {/await}
  </div>
</div>