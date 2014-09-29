EvilText is a static site generator, it also can generate blogs, wikis and shops.
Give it a folder with bunch of text and image files and it generates the website.

See [blog example](http://blog-example.eviltext.com) or
[shop example](http://shop-example.eviltext.com).

# How it works

Source files are copied to `/build` folder. so, every source file is still accessible 
in generated site. After that files processed - Markdown converted to HTML, images resized, etc.
Finally content sorted by dates and tags and the HTML site generated from it.

# File structure

Site consist of one config and multiple content files. Content files can reside at the top 
level (same level as config)

    - mysite
      - config.md        <-- config
      - first-post.md
      - second-post.md   <-- content files  
      - third-post.md
      ...
      
or at the second level (be inside arbitrary folder)

    - mysite
      - config.md         <-- config 
      - some-folder       <-- arbitrary folder
        - first-post.md   <-- content files
        - second-post.md
      - another-folder
        - third-post.md
      ...
        
It is also possible to define multiple sites if different configs put in different folders.
For example, to generate blog and wiki - create two folders and put different
configs in each - `mysite/blog/config.md` and `mysite/wiki/config.md`.

    - mysite
      - blog              <-- Blog
        - config.md
        - first-post.md
      - wiki              <-- Wiki
        - config.md
        - first-page.md
      ...


# Config

Config is a file that defines what type of site (blog, wiki, shop, etc.) should be generated and 
its configuration. It can be defined in YAML or Markdown.

In case of Markdown it should contain list of lines when each line is started with the dash, and, 
the attribute and its value delimited with the colon (for boolean attributes the colon can be 
omited), see example below.

    - Type       : Blog
    - Title      : My Blog
    - About      : Life and Technology
    - Navigation : Home, /, Contact me, mailto:me@mail.com
    - Comments

## Config options

**about** - short description of the site, optional.  
Example `- About: Blog about Photography`.

**type** - the type of site, can be `blog`, `wiki` or `shop`, required.  
Example `- Type: Blog`.

**bottom** - HTML that would be included in the bottom of the site, optional.  
Example `- Bottom: <script>alert('hi')</script>`

**comments** - enables comments, disabled by default. If you enable it
you should also provide your Disqus Id.  
Example

    - Comments
    - Disqus: my-disqus-id

**details** - additional details about site, optional.  
Example `- Details : Contact us +1 222 33 44`

**googleId** - Google Analytics Id will be added to site, optional.  
Example `- Google ID: XX-XXXX`

**head** - HTML that would be included in the head of the site, optional.  
Example `- Bottom: <script>alert('hi')</script>`

**home** - path to the page that should be displayed as a home page for the site, optional, 
default is `/`. The path can be absolute or relative to the config file path.  
Example `- Home: welcome-page`.

**language** - language of the site, optional, default is `en`.  
Example `- Language: ru`.

**logo** - path to the logo image, can be absolute or relative to the config file path.  
Example `- Logo: logo.png`.

**mountAsRoot** - mount site at the root level, optional. If site not at the top level, for
example `/mysite/blog` - it will be displayed at `http://mysite/blog`. There will be nothing 
at `http://mysite`. If this option enabled the site would be also mounted as a root and 
also available at `http://mysite`.  
Example `- Mount as root`.

**navigation** - list of labels and paths that should be displayed as navigation, optional.
Defined as labels and paths divided by comma.  
Example `- Navigation: Home, /, Contact me, mailto:me@mail.com`

**perPage** - number of items on page, optional, defaults depends on the theme chosen.  
Example `- Per page: 25`.

**sortBy** - sorting, optional, defaults depends on the theme chosen, usually it's `date descending`. 
Defined as name of the attribute to sort by and the order. Available attributes to sort by
are `title` and `date`, available orders are `ascending` and `descending`.  
Example `- Sort by: title ascending`

**theme** - theme, optional. There are different themes available for different site types. 
Available themes 

- blog: svbtle
- wiki: clean, gray
- shop: air

Example `- Theme : svbtle`.

**title** - title of the site, optional.  
Example `- Title: My blog`.

Some site types and themes support additional custom attributes, you need to consult its
documentation for details. 

# Content

Content are files with text and images that used as a source to generate the site.

There are different types of content files, two main types are **text** and **gallery**. 
There's no need to explicitly specify content type, its type would be inferred by its 
content and usage.

Text content has text and options. In case of Markdown options specified as a list of lines
at the end of the file, it should be delimited by empty line from the main content. 
With each line is started with the dash, and, the attribute and its value delimited with 
the colon (for boolean attributes the colon can be omitted), see example below.

    # First post
    
    Some text...
    
    - Date : 2014/2/25
    - Tags : Photos, Melbourne, Australia
    - Draft

The **text content** is any Markdown file. 

The **gallery** is any Markdown file and the folder with **the same name** containing images. 
The generator would detect that it's a gallery and display it correspondingly. The only 
exception is if you provide text in the Markdown file, you need then explicitly
specify that it's a gallery by adding `- Type: Gallery` option.

# Content options

**date** - date of content, optional, in form of `YYYY/MM/DD`. Although it's optional, it's needed 
for sorting by date so it's better to provide it.  
Example: `- Date: 2014/2/22`

**draft** - mark content as draft, optional, false by default. If file mared as draft it would 
be excluded from listing and available only by its exact url.  
Example: `- Draft`

**image** - path to image that should be shown in preview for this content. optional. The path can 
be absolute or relative to the content file path. By default if content has any images (embedded 
in HTML or added as a gallery) the first image would be chosen.
Example `- Image: myarticle/preview.png`

**link** - path user should be redirected to when click on the content preview, optional. Usually 
when user click on preview of the content it would be redirected to the content itself. If the 
link option is specified user instead would be redirected to specified location.  
Example `- Link: http://some-external-site.com/more-details-about-the-matter`

**tags** - mark content with tags, list of tags delimited by comma, optional.  
Example `- Tags: Photos, Australia, Melbourne`

**title** - content title, optional. By default title would be inferred from the first heading of
the content or if there's no heading from the file name.  
Example `- Title: My first post`

**type** - explicitly specify type of content, optional, available options are `text`, `gallery`. 
By default it's inferred from the content if it's a text or a gallery if it doesn't have a text and
has images. Usually don't need to set it explicitly.  
Example `- Type: Gallery`