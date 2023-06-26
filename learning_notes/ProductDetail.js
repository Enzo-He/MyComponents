/*   const testUrl = 'https://res.cloudinary.com/dxvwresim/image/upload/image/SW2065_1.jpg'
  const images = [];
  if (product && product.images) {
    product.images.forEach((image) => {

      const isExists = fetchImage(testUrl)
      console.log(isExists, typeof isExists)

      // isExists.ok ? (
      //   console.log("image exists", isExists.ok)
      // ) : (
      //   console.log("image not exists", isExists.ok)
      // )

      images.push({
        // original: image.path?.replace(/^http:/, "https:"),
        // thumbnail: image.path?.replace(/^http:/, "https:"),
        // url: image.path?.replace(/^http:/, "https:"), 
        original: image.path,
        thumbnail: image.path,
        url: image.path,
        title: image.title,
        caption: image.name,
      });
    });
  }
  //react-image-lightbox -ends here
  console.log('====================================');
  console.log(images);
  console.log('====================================');

  async function fetchImage() {
    try {
      
      //console.log(url)
      const response = await fetch(testUrl);
      console.log(response.ok)
      return response;

    } catch (error) {
      console.error("There has been a problem with your fetch operation:", error);
    }
  } */


  const [images, setImages] = useState([]);
  useEffect(() => {
    async function handleImages() {
        const imagesArray = [];
        if (product && product.images) {
            for (const image of product.images) {
                const isExists = await fetchImage(image.path);
                console.log(isExists.ok, typeof isExists.ok);

                if (isExists.ok) {
                    console.log("image exists", isExists.ok);
                    imagesArray.push({
                        original: image.path,
                        thumbnail: image.path,
                        url: image.path,
                        title: image.title,
                        caption: image.name,
                    });
                } else {
                    console.log("image not exists", isExists.ok);
                }
            }
        }
        setImages(imagesArray);
    }
    handleImages();
}, [product]);

async function fetchImage(url) {
    try {
        const response = await fetch(url);
        return response;
    } catch (error) {
        console.error("There has been a problem with your fetch operation:", error);
    }
}

/* The issue is that the fetchImage function is asynchronous but you're not waiting for it to finish in the forEach loop before logging isExists. Because of the asynchronous nature of JavaScript, isExists is a Promise at the point you're logging it, not the result of the fetch operation. You should wait for the fetchImage function to complete by using await.

To use await in a forEach loop, you'll need to change your loop into a for...of loop, which allows for asynchronous operations. Here is the corrected code: */