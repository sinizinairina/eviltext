require "rubygems"
require "bundler/setup"
require "enterprise_script_service"

MEMORY_QUOTA = 8 << 20
INSTRUCTION_QUOTA = 200_000
TIME_QUOTA = 1.0

# script = if ARGV.size > 0
#   File.read(ARGV[0])
# else
#   STDIN.read
# end

1000.times do
  result = EnterpriseScriptService.run(
    input: {result: [26803196617, 0.475]},
    sources: [
      ["stdout", "@stdout_buffer = 'hello'"],
      ["foo", "@output = @input[:result]"]
    ],
    instructions: nil,
    timeout: TIME_QUOTA,
    instruction_quota: INSTRUCTION_QUOTA,
    instruction_quota_start: 0,
    memory_quota: MEMORY_QUOTA
  )
end

# puts result.inspect
