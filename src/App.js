import "./App.css";

import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Image from "react-bootstrap/Image";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import Row from "react-bootstrap/Row";

import * as IPFS from "ipfs-http-client";

import CreatePostForm from "./CreatePostForm";
import { useCallback, useEffect, useMemo, useState } from "react";

const ipfs = IPFS.create({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
});

async function getIpfsJson(hash) {
  const files = [];
  for await (let f of ipfs.cat(hash)) {
    files.push(decodeURIComponent(escape(String.fromCharCode(...f))));
  }
  return JSON.parse(files.join(""));
}

async function setIpfsJson(obj) {
  const { path: hash } = await ipfs.add(JSON.stringify(obj));
  return hash;
}

function useIpfsJsonObject(hash) {
  const [obj, setObj] = useState(null);
  useEffect(() => {
    if (hash) {
      getIpfsJson(hash)
        .then(setObj)
        .catch((err) => console.error(err));
    }
  }, [hash]);
  return obj;
}

function useLocalStorage(key) {
  const [value, setValue] = useState(null);
  useEffect(() => {
    const localValue = localStorage.getItem(key);
    if (localValue) {
      setValue(localValue);
    }
  }, [key]);
  const setLocalValue = useCallback(
    (incomingValue) => {
      localStorage.setItem(key, incomingValue);
      setValue(incomingValue);
    },
    [key]
  );
  return [value, setLocalValue];
}

function useUrlHash() {
  const [value, setValue] = useState(null);
  useEffect(() => {
    const localValue = window.location.hash.substring(1);
    if (localValue) {
      setValue(localValue);
    }
  }, []);
  const setLocalValue = useCallback(
    (incomingValue) => {
      window.location.hash = incomingValue;
      setValue(incomingValue);
    },
    []
  );
  return [value, setLocalValue];
}

async function loadPosts(nextHash, count) {
  const posts = [];
  while (nextHash && count > 0) {
    count -= 1;
    try {
      const post = await getIpfsJson(nextHash);
      post.hash = nextHash;
      nextHash = post.next;
      posts.push(post);
    } catch (err) {
      console.log(err);
      break;
    }
  }
  return [posts, nextHash];
}

function useProfilePosts(profile) {
  const [posts, setPosts] = useState([]);
  const [nextPostHash, setNextPostHash] = useState(null);

  const loadPostsCallback = useCallback(
    async (count) => {
      const [newPosts, newNextHash] = await loadPosts(nextPostHash, count);
      setPosts((posts) => [...posts, ...newPosts]);
      setNextPostHash(newNextHash);
    },
    [nextPostHash]
  );

  useEffect(() => {
    const nextHash = profile?.mostRecentPost;
    if (nextHash) {
      loadPosts(nextHash, 10).then(([newPosts, newNextHash]) => {
        setPosts((posts) => [...newPosts]);
        setNextPostHash(newNextHash);
      });
    }
  }, [profile]);

  return [posts, loadPostsCallback, !!nextPostHash];
}

function App() {
  const [profileHash, setProfileHash] = useUrlHash("profileHash");
  const profile = useIpfsJsonObject(profileHash);
  const [posts, loadPosts, hasMore] = useProfilePosts(profile);

  const [showCreatePost, setShowCreatePost] = useState(true);

  const onCreatePost = (post) => {
    if (profile) {
      post.next = profile.mostRecentPost;
    }
    setIpfsJson(post)
      .then((mostRecentPost) => ({
        ...profile,
        mostRecentPost,
      }))
      .then((newProfile) => setIpfsJson(newProfile))
      .then((newProfileHash) => setProfileHash(newProfileHash))
      .catch((err) => console.err(err));
  };

  return (
    <>
      <Container fluid className="mb-3 bg-dark">
        <Row>
          <Container style={{ maxWidth: "500px" }}>
            <Row>
              <Navbar bg="dark" variant="dark" expand="lg">
                <Navbar.Brand href=".">dSocial</Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                  <Nav className="me-auto">
                    <Nav.Link href=".">Home</Nav.Link>
                    <Nav.Link
                      onClick={() => setShowCreatePost((value) => !value)}
                    >
                      Create
                    </Nav.Link>
                  </Nav>
                </Navbar.Collapse>
              </Navbar>
            </Row>
          </Container>
        </Row>
      </Container>
      <Container style={{ maxWidth: "500px" }}>
        <Row>
          {(showCreatePost || posts.length == 0) ? (
            <CreatePostForm
              onCreatePost={onCreatePost}
              onHide={() => setShowCreatePost(false)}
            />
          ) : null}
        </Row>
      </Container>
      {posts.map((post, i) => (
        <Post key={post.hash} {...post} />
      ))}
      {hasMore ? (
        <Container className="mb-3" style={{ maxWidth: "500px" }}>
          <Row>
            <Col className="d-flex justify-content-center">
              <Button variant="secondary" onClick={() => loadPosts(10)}>
                Load More Posts...
              </Button>
            </Col>
          </Row>
        </Container>
      ) : null}
    </>
  );
}

function Post({ caption, image }) {
  return (
    <Container
      className="mb-3 p-0 border rounded"
      style={{ maxWidth: "500px" }}
    >
      <Row className="p-3">
        <Col>{caption}</Col>
      </Row>
      <Row>
        <Col>
          <Image width="100%" src={image}></Image>
        </Col>
      </Row>
    </Container>
  );
}

export default App;
