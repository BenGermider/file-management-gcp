fetch("http://backend:8000/api/hello")
  .then(res => res.json())
  .then(data => {
    document.getElementById("msg").innerText = data.message;
  });
