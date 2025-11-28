fetch('https://api.dictionaryapi.dev/api/v2/entries/en/hello')
  .then((response) => response.text().then((text) => {
    console.log('status', response.status)
    console.log(text.slice(0, 120))
  }))
  .catch((error) => {
    console.error(error)
  })
