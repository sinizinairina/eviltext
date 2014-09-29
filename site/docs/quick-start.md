# QuickStart

It's better to start form the samples

```
npm install -g eviltext

mkdir myblog
cd myblog

echo -e "- Application: Blog\n- Title: My Blog\n- About: Blog about me" > config.md
echo -e "# First post\n\nThe very first post...\n\n- Tags: Life, Work\n- Date : 2014/9/1" > post.md

eviltext build && eviltext serve
```

- Draft