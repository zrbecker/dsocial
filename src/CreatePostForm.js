import { useCallback, useRef, useState } from "react";

import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Image from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";

const ONE_MEGABYTE = 1048576;

function getDataURLFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof Blob)) {
      reject(new Error("Parameter must be of type 'Blob'."));
      return;
    }
    // if (file.size > ONE_MEGABYTE) {
    //   reject(new Error("Blob or File must be less than 1MB."));
    // }
    const reader = new FileReader();
    reader.addEventListener("load", (event) => {
      resolve(event.target.result);
    });
    reader.addEventListener("error", () => {
      const filename = file instanceof File ? `File "${file.name}"` : "Blob";
      reject(new Error(`Error reading ${filename}.`));
    });
    reader.readAsDataURL(file);
  });
}

function prepareImage(imageUrl) {
  const DESIRED_WIDTH = 300;
  const DESIRED_TYPE = "jpeg";
  const DESIRED_QUALITY = 1;
  return new Promise((resolve, reject) => {
    const img = new global.Image();
    img.addEventListener("load", () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const scalingFactor = DESIRED_WIDTH / img.width;
      const newWidth = img.width * scalingFactor;
      const newHeight = img.height * scalingFactor;
      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      resolve(canvas.toDataURL(DESIRED_TYPE, DESIRED_QUALITY));
    });
    img.addEventListener("error", () => {
      reject(new Error("Failed to load image"));
    });
    img.src = imageUrl;
  });
}

export default function CreatePostForm({ onCreatePost, onHide }) {
  const [postCaption, setPostCaption] = useState("");
  const [postImage, setPostImage] = useState(null);

  const [formDisabled, setFormDisabled] = useState(false);
  const [uploadDisabled, setUploadDisabled] = useState(true);
  const imageFileInput = useRef(null);

  const [displayError, setDisplayError] = useState(null);

  const onFormSubmit = useCallback(
    (event) => {
      event.preventDefault();
      if (onCreatePost) {
        onCreatePost({
          caption: postCaption,
          image: postImage,
        });
      }
      setPostCaption("");
      setPostImage(null);
      setFormDisabled(false);
      setUploadDisabled(true);
      if (imageFileInput.current) {
        imageFileInput.current.value = "";
      }
    },
    [onCreatePost, postCaption, postImage]
  );

  const onFileSelected = useCallback((event) => {
    setDisplayError(null);
    if (event.target.files.length > 0) {
      setPostImage(null);
      setUploadDisabled(false);
      setFormDisabled(true);
      getDataURLFromFile(event.target.files[0])
        .then(prepareImage)
        .then(setPostImage)
        .catch((err) => {
          if (imageFileInput.current) {
            imageFileInput.current.value = "";
            setDisplayError("You must select an image under 1MB.");
            setUploadDisabled(true);
          }
        })
        .finally(() => setFormDisabled(false));
    } else {
      setUploadDisabled(true);
    }
  }, []);

  return (
    <Container className="border rounded p-3 mb-3">
      <Form onSubmit={onFormSubmit} disabled={formDisabled}>
        <Row className="mb-3">
          <Col>
            <h3>Create Post</h3>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col>
            <Form.Group>
              <Form.Label visuallyHidden>Caption</Form.Label>
              <Form.Control
                id="caption"
                name="caption"
                as="textarea"
                placeholder="Say something about your image..."
                value={postCaption}
                onChange={(event) => setPostCaption(event.target.value)}
              ></Form.Control>
            </Form.Group>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col>
            <Form.Group>
              <Form.Label visuallyHidden>Image</Form.Label>
              <Form.Control
                type="file"
                ref={imageFileInput}
                onChange={onFileSelected}
              ></Form.Control>
              {displayError ? (
                <>
                  <Form.Text className="text-danger">{displayError}</Form.Text>
                  <br />
                </>
              ) : null}
              <Form.Text>Image will be resized to be 300px wide.</Form.Text>
            </Form.Group>
          </Col>
        </Row>
        {postImage ? (
          <Row className="mb-3">
            <Col className="d-flex justify-content-center">
              <Image src={postImage}></Image>
            </Col>
          </Row>
        ) : null}
        <Row className="mb-3">
          <Col>
            <Button type="submit" disabled={uploadDisabled}>
              Upload
            </Button>{" "}
            <Button variant="secondary" onClick={() => onHide()}>
              Hide
            </Button>
          </Col>
        </Row>
      </Form>
    </Container>
  );
}
