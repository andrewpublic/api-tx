<script>
  import { Label, Input, Helper, Badge } from 'flowbite-svelte';
  /**
	 * @type {any}
	 */
   export let bankApiKey;
</script>

<div class="w-4/12">
  <Label class="block mb-2 text-foreground">Up Bank API Key</Label>
  <Input id="BankApiKey" name="BankApiKey" required placeholder="Insert your API Key here..." bind:value={bankApiKey} />
  <Helper class="text-sm mt-2 bg-primary-50">
  <Badge>We don't save your info (yet).</Badge>
    <!-- We’ll never share your details. Read our <a href="/" class="font-medium text-primary-600 hover:underline dark:text-primary-500"> Privacy Policy </a> -->
  </Helper>
</div>
